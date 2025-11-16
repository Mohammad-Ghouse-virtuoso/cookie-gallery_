const createWebhookRoutes = require('../../routes/webhooks');
const sentryService = require('../../services/sentryService');

describe('Stripe webhook route', () => {
  const stripeSecret = 'whsec_testsecret';
  let stripeMock;
  let adminDbMock;
  let paymentServiceMock;
  let stripeHandler;
  let captureSpy;

  const createResponse = () => {
    const response = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    return response;
  };

  const getStripeHandler = router => {
    const layer = router.stack.find(entry => entry.route?.path === '/stripe');
    if (!layer) {
      throw new Error('Stripe route not registered');
    }
    return layer.route.stack[0].handle;
  };

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = stripeSecret;
    stripeMock = {
      webhooks: {
        constructEvent: vi.fn(),
      },
    };

    const webhookDoc = {
      get: vi.fn(() => Promise.resolve({ exists: false })),
      set: vi.fn(() => Promise.resolve()),
    };
    const orderDoc = {
      set: vi.fn(() => Promise.resolve()),
    };
    adminDbMock = {
      collection: vi.fn(collectionName => {
        if (collectionName === 'webhook_events') {
          return {
            doc: vi.fn(() => webhookDoc),
          };
        }
        if (collectionName === 'orders_v2') {
          return {
            doc: vi.fn(() => orderDoc),
          };
        }
        return {
          doc: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({ exists: false })),
            set: vi.fn(() => Promise.resolve()),
          })),
        };
      }),
    };

    paymentServiceMock = {
      finalizeOrder: vi.fn(() => Promise.resolve({ success: true })),
    };

    captureSpy = vi.spyOn(sentryService, 'captureException').mockImplementation(() => {});
    vi.spyOn(sentryService, 'withScope').mockImplementation((_, cb) => cb());
    vi.spyOn(sentryService, 'addBreadcrumb').mockImplementation(() => {});

    const router = createWebhookRoutes({
      stripeInstance: stripeMock,
      adminDb: adminDbMock,
      paymentService: paymentServiceMock,
    });

    stripeHandler = getStripeHandler(router);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  test('returns 400 when signature missing', async () => {
    const req = {
      headers: {},
      id: 'req-1',
      ip: '127.0.0.1',
      rawBody: Buffer.from('{}'),
    };
    const res = createResponse();

    await stripeHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Missing');
    expect(captureSpy).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      tags: expect.objectContaining({ webhook: 'stripe' }),
    }));
  });

  test('returns 400 on signature mismatch and reports to Sentry', async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Bad signature');
    });
    const req = {
      headers: { 'stripe-signature': 'invalid' },
      id: 'req-2',
      ip: '127.0.0.1',
      rawBody: Buffer.from('{}'),
    };
    const res = createResponse();

    await stripeHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('verification failed');
    expect(captureSpy).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      tags: expect.objectContaining({ reason: 'signature_mismatch' }),
    }));
  });

  test('finalizes order successfully when event is valid', async () => {
    const event = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test123',
          payment_status: 'paid',
          status: 'complete',
          amount_total: 1000,
          payment_intent: 'pi_test',
          metadata: { localOrderId: 'order_1' },
        },
      },
    };
    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    const req = {
      headers: { 'stripe-signature': 'valid' },
      id: 'req-3',
      ip: '127.0.0.1',
      rawBody: Buffer.from('{}'),
    };
    const res = createResponse();

    await stripeHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(paymentServiceMock.finalizeOrder).toHaveBeenCalledWith('order_1', expect.objectContaining({
      id: 'cs_test123',
      payment_status: 'paid',
    }));
  });

  test('reports reconciliation failure to Sentry', async () => {
    paymentServiceMock.finalizeOrder.mockResolvedValue({ success: false, error: 'Amount mismatch' });
    const event = {
      id: 'evt_fail',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_fail',
          payment_status: 'paid',
          status: 'complete',
          amount_total: 1000,
          payment_intent: 'pi_fail',
          metadata: { localOrderId: 'order_fail' },
        },
      },
    };
    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    const req = {
      headers: { 'stripe-signature': 'valid' },
      id: 'req-4',
      ip: '127.0.0.1',
      rawBody: Buffer.from('{}'),
    };
    const res = createResponse();

    await stripeHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.warning).toBe('Reconciliation failed');
    expect(captureSpy).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      tags: expect.objectContaining({ localOrderId: 'order_fail' }),
    }));
  });

  test('ignores already processed event (idempotency)', async () => {
    const event = {
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_dup',
          payment_status: 'paid',
          status: 'complete',
          amount_total: 1000,
          payment_intent: 'pi_dup',
          metadata: { localOrderId: 'order_dup' },
        },
      },
    };
    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    const webhookDocProcessed = {
      get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({ status: 'processed' }) })),
    };

    adminDbMock.collection.mockImplementation(collectionName => {
      if (collectionName === 'webhook_events') {
        return {
          doc: vi.fn(() => webhookDocProcessed),
        };
      }
      if (collectionName === 'orders_v2') {
        return {
          doc: vi.fn(() => ({ set: vi.fn(() => Promise.resolve()) })),
        };
      }
      return {
        doc: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve({ exists: false })),
          set: vi.fn(() => Promise.resolve()),
        })),
      };
    });

    const req = {
      headers: { 'stripe-signature': 'valid' },
      id: 'req-5',
      ip: '127.0.0.1',
      rawBody: Buffer.from('{}'),
    };
    const res = createResponse();

    await stripeHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Already processed');
    expect(paymentServiceMock.finalizeOrder).not.toHaveBeenCalled();
  });
});
