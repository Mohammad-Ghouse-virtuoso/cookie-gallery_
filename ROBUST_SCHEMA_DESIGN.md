# Robust Schema Design - Handling Real-World Cases

## Design Philosophy

**Rule 1:** Snapshot data that must be immutable (legal, audit trail)
**Rule 2:** Normalize data that's reusable or needs consistency
**Rule 3:** Denormalize for read performance when needed

---

## Schema Design

### 1. `users` Collection (Master Profile)
**Purpose:** Single source of truth for user data
**Document ID:** Email (lowercase)

```javascript
{
  uid: "user@example.com",
  authUid: "firebase-uid-abc123",
  email: "user@example.com",
  displayName: "John Doe",
  phoneNumber: "+919876543210",
  
  // Metadata
  metadata: {
    totalOrders: 5,
    totalSpent: 2500,
    lastOrderAt: Timestamp
  },
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Why normalize:** One place to update user profile

---

### 2. `addresses` Collection (Reusable Addresses)
**Purpose:** Saved addresses for quick checkout
**Document ID:** Auto-generated UUID

```javascript
{
  addressId: "addr_abc123",
  userId: "user@example.com",
  
  // Address details
  fullName: "John Doe",
  phone: "+919876543210",
  email: "user@example.com",  // Optional
  addressLine1: "123 Main St",
  addressLine2: "Apt 4B",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400001",
  country: "India",
  
  // Metadata
  isDefault: true,
  label: "Home",  // Home, Work, Other
  
  createdAt: Timestamp,
  lastUsedAt: Timestamp
}
```

**Index:** `userId` (to fetch all addresses for a user)

**Benefits:**
- User can select from saved addresses
- "Use previous address" feature
- Address validation done once

---

### 3. `orders` Collection (Order Metadata)
**Purpose:** Order status and references
**Document ID:** Auto-generated UUID

```javascript
{
  orderId: "ord_abc123",
  userId: "user@example.com",  // Reference to users
  
  // Order basics
  status: "completed",  // pending, processing, completed, failed, refunded
  totalAmount: 1299,
  currency: "INR",
  itemCount: 3,
  
  // References (NOT embedded data)
  shippingAddressSnapshot: {
    // SNAPSHOT: Copy address at time of order
    // Even if user deletes address later, order keeps it
    fullName: "John Doe",
    phone: "+919876543210",
    addressLine1: "123 Main St",
    city: "Mumbai",
    postalCode: "400001"
  },
  
  // For gifts: Additional recipient address
  recipientAddressSnapshot: {
    fullName: "Jane Smith",
    phone: "+919999999999",
    addressLine1: "456 Oak Ave",
    city: "Delhi",
    postalCode: "110001",
    giftMessage: "Happy Birthday! 🎂"
  },
  
  // Payment reference (not full details)
  paymentId: "pay_xyz789",  // Reference to payments collection
  
  // Order metadata
  orderType: "standard",  // standard, gift
  source: "web",
  notes: "",
  
  // Timestamps
  createdAt: Timestamp,
  confirmedAt: Timestamp,
  completedAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes:**
- `userId + createdAt` (user order history)
- `status + createdAt` (admin dashboard)

**Why snapshot addresses:**
✅ Legal requirement: Order must show address at time of purchase
✅ User deletes address → Order still shows where it was shipped
✅ Audit trail intact

---

### 4. `order_items` Collection (Line Items)
**Purpose:** Individual cookies ordered (enables analytics)
**Document ID:** Auto-generated

```javascript
{
  orderItemId: "item_abc123",
  orderId: "ord_abc123",  // Reference to orders
  
  // Product details
  cookieId: "choco-chip",
  cookieName: "Chocolate Chip Cookie",
  quantity: 2,
  unitPrice: 299,
  subtotal: 598,
  
  // Product snapshot (in case product changes/deleted)
  productSnapshot: {
    name: "Chocolate Chip Cookie",
    description: "Classic recipe...",
    imageUrl: "https://...",
    sku: "CC-001"
  },
  
  createdAt: Timestamp
}
```

**Index:** `orderId` (to fetch all items in an order)

**Why separate collection:**
✅ Analytics: "SELECT cookieId, SUM(quantity) FROM order_items"
✅ Reporting: "Top 10 bestsellers this month"
✅ Inventory: "Total Choco Chip sold = 245"
✅ Small documents = faster reads

---

### 5. `payments` Collection (Payment Transactions)
**Purpose:** Payment details separate from orders
**Document ID:** Auto-generated UUID

```javascript
{
  paymentId: "pay_xyz789",
  orderId: "ord_abc123",  // Reference back to order
  userId: "user@example.com",
  
  // Provider details
  provider: "stripe",
  providerTransactionId: "pi_abc123",  // Stripe Payment Intent ID
  providerSessionId: "cs_abc123",
  
  // Payment status
  status: "succeeded",
  amount: 1299,
  currency: "INR",
  
  // Payment method (safe details only)
  paymentMethod: {
    type: "card",
    cardBrand: "visa",
    cardLast4: "4242",
    cardCountry: "US"
  },
  
  // Billing snapshot (at time of payment)
  billingSnapshot: {
    name: "John Doe",
    email: "user@example.com",  // Even if user changes email later
    phone: "+919876543210"
  },
  
  // Transaction details
  receiptUrl: "https://stripe.com/receipt",
  
  // Timestamps
  createdAt: Timestamp,
  authorizedAt: Timestamp,
  capturedAt: Timestamp
}
```

**Why snapshot billing:**
✅ Payment records are immutable (accounting requirement)
✅ Shows email/phone at time of payment
✅ User changes profile → Payment record unchanged

---

## Handling Your Specific Cases

### Case 1: Phone Sign-In Users Add Email Later
**Flow:**
1. User signs in with phone → `users.email = null` initially
2. During checkout, user adds email
3. Update `users` collection: `email = "user@example.com"`
4. Order stores email snapshot (even if user removes it later)

```javascript
// orders collection
{
  orderId: "ord_123",
  userId: "+919876543210",  // Phone number as userId
  customerEmailSnapshot: "user@example.com",  // Email provided during checkout
  shippingAddressSnapshot: { email: "user@example.com", ... }
}
```

✅ Order keeps email forever (for receipt, tracking)
✅ User can change/remove email later in profile
✅ Historical orders unaffected

---

### Case 2: Gifting (Two Addresses)
**Flow:**
1. Buyer places order
2. Selects "This is a gift"
3. Provides recipient address + gift message

```javascript
// orders collection
{
  orderId: "ord_456",
  userId: "buyer@example.com",
  orderType: "gift",
  
  // Buyer's billing address
  shippingAddressSnapshot: {
    fullName: "John Doe (Buyer)",
    addressLine1: "123 Buyer St",
    city: "Mumbai"
  },
  
  // Recipient's address
  recipientAddressSnapshot: {
    fullName: "Jane Smith (Recipient)",
    addressLine1: "456 Recipient Ave",
    city: "Delhi",
    giftMessage: "Happy Birthday! 🎂"
  }
}
```

✅ Two addresses stored
✅ Clear distinction (billing vs recipient)
✅ Gift message preserved

---

### Case 3: User Updates Profile
**Scenario:** User changes email from `old@example.com` → `new@example.com`

**What happens:**
1. Update `users` collection: `email = "new@example.com"`
2. Past orders keep `old@example.com` in snapshot
3. Future orders use `new@example.com`

**Why this is correct:**
✅ Historical records accurate
✅ Receipts sent to old email are still valid
✅ Audit trail preserved
✅ New orders get updated email

---

## Migration Strategy (Safe & Gradual)

### Phase 1: Add New Collections (Non-Breaking)
- Create `order_items`, `payments`, `addresses` collections
- Keep existing `orders` and `orders_v2`
- Backend writes to BOTH old and new schemas
- **Zero downtime, zero risk**

### Phase 2: Dual-Write Period (2-4 weeks)
- All new orders written to both schemas
- Read from new schema, fallback to old if missing
- Monitor for issues
- Collect data in new format

### Phase 3: Migrate Historical Data
- Run migration script to transform old orders
- Verify data integrity
- Keep old collections as backup

### Phase 4: Switch to New Schema Only
- Stop writing to old collections
- Remove legacy code
- Archive old data

---

## Benefits Summary

### For Users:
✅ Faster checkout (saved addresses)
✅ Order history (future feature)
✅ Consistent experience

### For You (Business):
✅ Analytics: Know what sells
✅ Pricing decisions: Data-driven
✅ Marketing ROI: Measure campaigns
✅ Inventory planning: Restock smart
✅ Customer insights: Buying patterns

### For Developers:
✅ Smaller documents = faster queries
✅ Better indexes = better performance
✅ Clear separation = easier debugging
✅ Scalable = handles growth

---

## Cost Impact

### Current (Embedded Cart):
- Order document: ~2KB (with full cart + address)
- 1000 orders = 2MB storage
- Read 1 order = 2KB transfer

### Normalized:
- Order: 0.5KB, Items: 0.3KB each (3 items = 0.9KB), Payment: 0.5KB
- Total: ~2KB (same storage, but split across collections)
- Read 1 order metadata only = 0.5KB (75% less data)
- Read with items = 1.4KB (multiple documents, still efficient)

**Firestore pricing:** $0.06 per 100K reads
- Current: 1000 order reads = $0.001
- Normalized: 1000 order reads (metadata only) = $0.0003 (70% cheaper)

**Savings at scale:** At 100K orders/month, save ~$5-10/month on reads

---

## Next Steps

1. ✅ Deploy Firestore indexes (critical, do now)
2. ⏭️ Review this schema design
3. ⏭️ Decide: Migrate now or wait until you add order history?
4. ⏭️ I can implement Phase 1 (dual-write) without breaking anything

**Question:** Want me to implement Phase 1 (start writing to new schema alongside old)?
