# Quick Reference Guide - Security & Ops Implementation

## 🚀 Quick Start

### 1. Setup (First Time)
```bash
# Install dependencies
npm install
cd src/backend && npm install && cd ../..

# Copy environment files
cp .env.example .env
cp src/backend/.env.example src/backend/.env

# Install git-secrets
brew install git-secrets  # macOS
# OR
sudo apt-get install git-secrets  # Linux

# Configure git-secrets
git secrets --install
git secrets --register-aws
```

### 2. Development
```bash
# Terminal 1: Backend
cd src/backend && node server.js

# Terminal 2: Frontend
npm run dev
```

### 3. Testing
```bash
# Frontend tests
npm run test

# Backend tests
cd src/backend && npm test

# Lint
npm run lint
```

---

## 🔧 Common Commands

### Git Workflow
```bash
# Make changes
git add .
git commit -m "feat: your message"
# Pre-commit hook runs automatically: lint + test + secrets scan

git push
# Pre-push hook runs: full test suite + linter
```

### Bypass Hooks (Emergency Only)
```bash
git commit --no-verify
git push --no-verify
```

### Fix Linting
```bash
npm run lint:fix
```

---

## 📡 API Endpoints

### Webhooks (Use These)
```
POST /api/webhooks/stripe      # New Stripe webhook
POST /api/webhooks/razorpay    # New Razorpay webhook  
GET  /api/order-status?orderId=xxx  # Order status + reconciliation
```

### Legacy (Backwards Compatible)
```
POST /api/payment-webhook      # Old Stripe endpoint
```

---

## 🔑 Environment Variables

### Required
```bash
# Frontend
VITE_STRIPE_PUBLISHABLE_KEY
VITE_FIREBASE_*
VITE_SENTRY_DSN  # Optional but recommended

# Backend
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET  # NEW - Required for webhooks
FIREBASE_*
SENTRY_DSN  # Optional but recommended
```

### Optional
```bash
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

---

## 🧪 Testing Webhooks

### Stripe CLI
```bash
# Install
brew install stripe/stripe-cli/stripe

# Listen
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# Trigger test
stripe trigger checkout.session.completed
```

### Manual Test
```bash
# Invalid signature (should fail)
curl -X POST http://localhost:5000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  -d '{"test": "data"}'
```

---

## 🚨 Troubleshooting

### Pre-commit Hook Failing
```bash
# Check what's failing
npm run lint
npm run test

# Fix lint issues
npm run lint:fix

# Skip if emergency
git commit --no-verify
```

### Git Secrets Blocking Commit
```bash
# If false positive, add exception:
git secrets --add --allowed 'pattern-to-allow'

# Or skip (NOT recommended)
git commit --no-verify
```

### Sentry Not Working
```bash
# Check DSN is set
echo $VITE_SENTRY_DSN  # Frontend
echo $SENTRY_DSN  # Backend

# Check logs
tail -f src/backend/combined.log
```

### Webhook Not Processing
```bash
# Check logs
tail -f src/backend/combined.log | grep webhook

# Check Firestore webhook_events collection
# Status should be 'processed', not 'failed'
```

---

## 📊 Monitoring

### Check Order Status
```bash
curl http://localhost:5000/api/order-status?orderId=YOUR_ORDER_ID
```

### View Webhook Events (Firestore)
```
Collection: webhook_events
Document ID: stripe_evt_xxx or razorpay_xxx
Fields: provider, eventId, status, receivedAt
```

### Check Sentry
- Dashboard: https://sentry.io/organizations/your-org/issues/
- Filter by: `level:error`, `context:payment`

---

## 🔐 Security Checklist

- [ ] `.env` files not committed
- [ ] Webhook secrets configured
- [ ] git-secrets installed and configured
- [ ] Sentry DSN set
- [ ] Pre-commit hooks working
- [ ] Test webhook signature verification
- [ ] Review Sentry alerts

---

## 📚 Documentation

- **Full Guide:** `SECURITY_OPS_IMPLEMENTATION.md`
- **Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Contributing:** `CONTRIBUTING.md`
- **This File:** `QUICK_REFERENCE.md`

---

## 🆘 Getting Help

1. Check documentation above
2. Review error logs
3. Check Sentry dashboard
4. Ask team for help
5. Review GitHub issues

---

**Last Updated:** November 15, 2025
