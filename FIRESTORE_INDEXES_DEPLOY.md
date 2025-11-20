# Firestore Index Deployment Guide

## ⚠️ CRITICAL: Deploy These Indexes to Production

Your backend queries **will fail in production** without these indexes.

## Important Notes

**Single-field indexes** (like `providerSessionId`) are **automatically created** by Firestore.
You only need to manually create **composite indexes** (2+ fields).

## Deploy Methods

### Option 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `cookie-gallery`
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Add Index** for each:

#### Index 1: Idempotency Lookup

- Collection: `orders_v2`
- Fields:
  - `idempotencyKey` (Ascending)
  - `userEmail` (Ascending)

#### Index 2: User Orders by Date

- Collection: `orders_v2`
- Fields:
  - `userEmail` (Ascending)
  - `createdAt` (Descending)

#### Index 3: Orders by Status

- Collection: `orders_v2`
- Fields:
  - `status` (Ascending)
  - `createdAt` (Descending)

#### Index 4: Legacy Orders

- Collection: `orders`
- Fields:
  - `userId` (Ascending)
  - `createdAt` (Descending)

### Option 2: Firebase CLI (Automated)

```bash
# Install Firebase CLI if not installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore in your project (if not done)
firebase init firestore

# Deploy indexes
firebase deploy --only firestore:indexes

# This reads firestore.indexes.json and creates all indexes
```

## Verification

After deployment, check index status:

1. Firebase Console → Firestore → Indexes tab
2. Status should show "Enabled" (not "Building")
3. Building takes 5-30 minutes depending on data volume

## What Happens Without These?

### Development Mode

✅ Works fine (Firebase auto-creates single-field indexes)

### Production Mode

❌ Queries fail with error:

```text
"The query requires an index. You can create it here: [link]"
```

## Current Queries Using These Indexes

| Query Location | Index Used | Purpose |
|----------------|------------|---------|
| `server.js:201-202` | idempotencyKey + userEmail | Prevent duplicate orders |
| `server.js:220` | providerSessionId | Find order by Stripe session |
| Future `/api/user-orders` | userEmail + createdAt | Order history |
| Admin dashboard (future) | status + createdAt | Filter by order status |

## Index Build Time Estimate

- **Small dataset** (<100 orders): ~5 minutes
- **Medium dataset** (100-10k orders): ~15-30 minutes
- **Large dataset** (>10k orders): 1-2 hours

You can deploy indexes **before** you have data - they'll be ready when needed.

## Cost

Firestore indexes are **free** to create and maintain. You only pay for:

- Document reads (same cost whether indexed or not)
- Storage (indexes add ~5-10% overhead)

## Next Steps

1. ✅ Deploy indexes using Option 1 or 2
2. ✅ Wait for "Enabled" status
3. ✅ Test production queries
4. ✅ Monitor Firebase Console for any index warnings
