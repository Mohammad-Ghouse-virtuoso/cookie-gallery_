const express = require('express');
const crypto = require('crypto');
const logger = require('../logger');
const sentryService = require('../services/sentryService');

function createWebhookRoutes({ stripeInstance, adminDb, paymentService }) {
  const router = express.Router();
  const WEBHOOK_EVENTS_COLLECTION = 'webhook_events';

  async function isEventProcessed(eventId, provider) {
    if (!adminDb) return false;
    
    try {
      const eventsRef = adminDb.collection(WEBHOOK_EVENTS_COLLECTION);
      const doc = await eventsRef.doc(`${provider}_${eventId}`).get();
      return doc.exists && doc.data().status === 'processed';
    } catch (error) {
      logger.error('Error checking event idempotency', { eventId, provider, error: error.message });
      return false;
    }
  }

  async function recordWebhookEvent(eventId, provider, localOrderId, payload, status) {
    if (!adminDb) return;

    try {
      const eventsRef = adminDb.collection(WEBHOOK_EVENTS_COLLECTION);
      await eventsRef.doc(`${provider}_${eventId}`).set({
        provider,
        eventId,
        localOrderId: localOrderId || null,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
        status,
        receivedAt: new Date(),
        processedAt: status === 'processed' ? new Date() : null
      });
    } catch (error) {
      logger.error('Error recording webhook event', { eventId, provider, error: error.message });
    }
  }

  function verifyRazorpaySignature(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  router.post('/stripe', async (req, res) => {
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeInstance || !STRIPE_WEBHOOK_SECRET) {
      logger.warn('Stripe webhook received but Stripe not configured');
      return res.status(200).json({ received: true, message: 'Stripe not configured' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      logger.warn('Stripe webhook missing signature header', { 
        requestId: req.id,
        ip: req.ip 
      });
      sentryService.captureException(new Error('stripe_missing_signature'), {
        level: 'warning',
        tags: {
          category: 'payment',
          webhook: 'stripe',
        },
        extra: {
          requestId: req.id,
          ip: req.ip,
        },
      });
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      event = stripeInstance.webhooks.constructEvent(
        req.rawBody,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.warn('Stripe webhook signature verification failed', {
        error: err.message,
        requestId: req.id,
        signatureHeader: signature.substring(0, 20) + '...'
      });
      sentryService.captureException(err, {
        tags: {
          category: 'payment',
          webhook: 'stripe',
          reason: 'signature_mismatch',
        },
        extra: {
          requestId: req.id,
          signature: signature.substring(0, 16) + '...'
        }
      });
      return res.status(400).json({ error: `Webhook signature verification failed` });
    }

    const eventId = event.id;
    const alreadyProcessed = await isEventProcessed(eventId, 'stripe');
    
    if (alreadyProcessed) {
      logger.info('Stripe webhook event already processed (idempotent)', { eventId });
      return res.status(200).json({ received: true, message: 'Already processed' });
    }

    const session = event?.data?.object || {};
    const localOrderId = session.metadata?.localOrderId || session.client_reference_id || null;
    const providerSessionId = session.id || null;

    await recordWebhookEvent(eventId, 'stripe', localOrderId, event, 'received');

    return sentryService.withScope({
      tags: {
        category: 'payment',
        webhook: 'stripe',
        eventId,
        providerSessionId,
        localOrderId,
      },
      extra: {
        eventType: event.type,
      },
    }, async () => {
      sentryService.addBreadcrumb({
        category: 'payment.webhook',
        message: `Stripe webhook received: ${event.type}`,
        level: 'info',
        data: {
          eventId,
          providerSessionId,
          localOrderId,
        },
      });

      try {
        if (!adminDb) {
          await recordWebhookEvent(eventId, 'stripe', localOrderId, event, 'failed_no_db');
          return res.status(503).json({ error: 'Database not configured' });
        }

        logger.info('Processing Stripe webhook', {
          eventType: event.type,
          sessionId: providerSessionId,
          eventId,
        });

        if (event.type === 'checkout.session.completed' ||
            event.type === 'checkout.session.async_payment_succeeded') {
          if (!localOrderId) {
            logger.warn('Stripe webhook missing localOrderId', {
              eventType: event.type,
              sessionId: providerSessionId,
              eventId,
            });
            await recordWebhookEvent(eventId, 'stripe', null, event, 'failed_no_order_id');
            return res.status(200).json({ received: true, warning: 'Missing order ID' });
          }

          const result = await paymentService.finalizeOrder(localOrderId, {
            id: providerSessionId,
            payment_status: session.payment_status,
            status: session.status,
            amount_total: session.amount_total,
            payment_intent: session.payment_intent,
            provider: 'stripe',
          });

          if (!result.success) {
            logger.error('Order finalization failed', {
              localOrderId,
              error: result.error,
              eventId,
            });
            await recordWebhookEvent(eventId, 'stripe', localOrderId, event, 'failed_reconcile');
            sentryService.captureException(new Error('order_reconciliation_failed'), {
              tags: {
                category: 'payment',
                webhook: 'stripe',
                eventId,
                localOrderId,
              },
              extra: {
                error: result.error,
              },
            });
            return res.status(200).json({
              received: true,
              warning: 'Reconciliation failed',
              error: result.error,
            });
          }

          await recordWebhookEvent(eventId, 'stripe', localOrderId, event, 'processed');
          logger.info('Stripe webhook processed successfully', { localOrderId, eventId });
        } else if (event.type === 'checkout.session.expired' ||
                   event.type === 'checkout.session.async_payment_failed') {
          if (localOrderId) {
            const ordersRef = adminDb.collection('orders_v2');
            await ordersRef.doc(localOrderId).set({
              status: 'failed',
              providerInfo: {
                id: providerSessionId,
                payment_status: session.payment_status,
                status: session.status,
                provider: 'stripe',
              },
              lastKnownError: `Session ${event.type}`,
              updatedAt: new Date(),
            }, { merge: true });

            await recordWebhookEvent(eventId, 'stripe', localOrderId, event, 'processed');
            logger.info('Stripe webhook marked order as failed', { localOrderId, eventId });
          }
        }

        return res.status(200).json({ received: true });
      } catch (error) {
        logger.error('Error processing Stripe webhook', {
          error: error.message,
          eventId,
          stack: error.stack,
        });
        await recordWebhookEvent(eventId, 'stripe', localOrderId, event, 'failed_processing');
        sentryService.captureException(error, {
          tags: {
            category: 'payment',
            webhook: 'stripe',
            eventId,
            localOrderId,
          },
        });
        return res.status(500).json({ error: 'Webhook processing error' });
      }
    });
  });

  router.post('/razorpay', async (req, res) => {
    const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!RAZORPAY_WEBHOOK_SECRET) {
      logger.warn('Razorpay webhook received but secret not configured');
      return res.status(200).json({ received: true, message: 'Razorpay not configured' });
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      logger.warn('Razorpay webhook missing signature header', { 
        requestId: req.id,
        ip: req.ip 
      });
      return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
    }

    try {
      const isValid = verifyRazorpaySignature(req.body, signature, RAZORPAY_WEBHOOK_SECRET);
      
      if (!isValid) {
        logger.warn('Razorpay webhook signature verification failed', {
          requestId: req.id,
          signatureHeader: signature.substring(0, 20) + '...'
        });
        return res.status(400).json({ error: 'Webhook signature verification failed' });
      }
    } catch (err) {
      logger.error('Razorpay signature verification error', { error: err.message });
      return res.status(400).json({ error: 'Signature verification error' });
    }

    const event = req.body;
    const eventId = event.payload?.payment?.entity?.id || event.event || Date.now().toString();
    
    const alreadyProcessed = await isEventProcessed(eventId, 'razorpay');
    
    if (alreadyProcessed) {
      logger.info('Razorpay webhook event already processed (idempotent)', { eventId });
      return res.status(200).json({ received: true, message: 'Already processed' });
    }

    await recordWebhookEvent(eventId, 'razorpay', null, event, 'received');

    try {
      logger.info('Processing Razorpay webhook', { 
        eventType: event.event, 
        eventId 
      });

      if (event.event === 'payment.captured') {
        const payment = event.payload.payment.entity;
        const localOrderId = payment.notes?.localOrderId;

        if (!localOrderId) {
          logger.warn('Razorpay webhook missing localOrderId', { 
            eventId,
            paymentId: payment.id 
          });
          await recordWebhookEvent(eventId, 'razorpay', null, event, 'failed_no_order_id');
          return res.status(200).json({ received: true, warning: 'Missing order ID' });
        }

        const result = await paymentService.finalizeOrder(localOrderId, {
          id: payment.id,
          payment_status: 'captured',
          status: payment.status,
          amount: payment.amount,
          provider: 'razorpay'
        });

        if (!result.success) {
          await recordWebhookEvent(eventId, 'razorpay', localOrderId, event, 'failed_reconcile');
          sentryService.captureException(new Error('razorpay_order_reconciliation_failed'), {
            tags: {
              category: 'payment',
              webhook: 'razorpay',
              eventId,
              localOrderId,
            },
            extra: {
              error: result.error,
            },
          });
        } else {
          await recordWebhookEvent(eventId, 'razorpay', localOrderId, event, 'processed');
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Error processing Razorpay webhook', { 
        error: error.message,
        eventId 
      });
      await recordWebhookEvent(eventId, 'razorpay', null, event, 'failed_processing');
      res.status(500).json({ error: 'Webhook processing error' });
    }
  });

  return router;
}

module.exports = createWebhookRoutes;
