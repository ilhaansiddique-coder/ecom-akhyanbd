# Concurrency & Stock Management Fixes

## Current Issues
1. **SQLite** - Only 1 write transaction at a time (entire database locked)
2. **Race Condition** - Stock check and decrement aren't atomic
3. **No Optimistic Locking** - No version control on products
4. **Timeout Risk** - Under load, transactions will queue and timeout

---

## OPTION 1: Quick Fixes (Keep SQLite) 🟡
**For 10-20 concurrent users**

### 1.1 Add Optimistic Locking
Add a version field to products:

```prisma
model Product {
  // ... existing fields
  version    Int       @default(0)  // Add this
}
```

Update stock with version check:
```typescript
// In orders/route.ts, replace the product update (line 108-114)
const updateResult = await tx.product.updateMany({
  where: {
    id: item.product_id,
    version: prod.version,  // Only update if version matches
    stock: { gte: item.quantity }  // Additional safety check
  },
  data: {
    stock: { decrement: item.quantity },
    soldCount: { increment: item.quantity },
    version: { increment: 1 }
  }
});

if (updateResult.count === 0) {
  throw new Error(`${prod.name} is out of stock or was just purchased`);
}
```

### 1.2 Enable WAL Mode for SQLite
In your Prisma connection, enable Write-Ahead Logging:

```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?journal_mode=WAL'
    }
  }
});
```

This allows concurrent reads with writes (better performance).

### 1.3 Add Request Timeouts & Retries
```typescript
// In orders/route.ts
const MAX_RETRIES = 3;
for (let i = 0; i < MAX_RETRIES; i++) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // ... existing transaction code
    }, {
      timeout: 10000,  // 10 second timeout
      isolationLevel: 'Serializable'
    });
    break;  // Success
  } catch (err) {
    if (i === MAX_RETRIES - 1) throw err;
    await new Promise(r => setTimeout(r, 100 * (i + 1)));  // Exponential backoff
  }
}
```

---

## OPTION 2: Medium Fix (Use PostgreSQL) 🟢
**For 50-100+ concurrent users** (RECOMMENDED)

### Why PostgreSQL?
- ✅ Row-level locking (`SELECT FOR UPDATE`)
- ✅ Multiple concurrent writes
- ✅ Better connection pooling
- ✅ Production-ready for e-commerce

### Migration Steps:

1. **Install PostgreSQL** (local or cloud like Supabase/Neon)

2. **Update .env**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mavesoj"
```

3. **Update schema.prisma**:
```prisma
datasource db {
  provider = "postgresql"  // Change from sqlite
  url      = env("DATABASE_URL")
}
```

4. **Run migration**:
```bash
npx prisma migrate dev --name switch_to_postgres
```

5. **Update order transaction with row locking**:
```typescript
// In orders/route.ts (line 56)
const products = await tx.$queryRaw`
  SELECT * FROM products
  WHERE id = ANY(${productIds}::int[])
  FOR UPDATE  -- This locks the rows until transaction completes
`;
```

---

## OPTION 3: Advanced (Redis Queue) 🔴
**For 500+ concurrent users**

Use a job queue system:
- Orders go into Redis queue
- Worker processes handle orders sequentially per product
- Returns "Order Confirmed - Processing" immediately to user
- Sends email when actually processed

---

## Testing Concurrent Purchases

Create a test script:

```javascript
// test-concurrency.js
const users = 20;
const promises = [];

for (let i = 0; i < users; i++) {
  promises.push(
    fetch('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: `Test User ${i}`,
        customer_phone: `01700000${i.toString().padStart(3, '0')}`,
        city: 'Dhaka',
        customer_address: 'Test Address',
        payment_method: 'cod',
        items: [{ product_id: 1, quantity: 1, price: 100 }]
      })
    })
  );
}

Promise.all(promises)
  .then(responses => Promise.all(responses.map(r => r.json())))
  .then(results => console.log('Results:', results))
  .catch(err => console.error('Error:', err));
```

Run with: `node test-concurrency.js`

Check if stock went negative or orders failed.

---

## Immediate Priority

**For your current scale (20 users), do this NOW:**

1. ✅ Enable WAL mode (5 min fix)
2. ✅ Add optimistic locking with version field (30 min fix)
3. ✅ Add retry logic (15 min fix)

**For growth (100+ users), plan to:**
- Migrate to PostgreSQL within 1-2 months
- Add proper monitoring (Sentry for errors)
- Set up load testing

---

## Monitoring

Add logging to track concurrent issues:

```typescript
// In orders/route.ts transaction
console.log(`[ORDER] User ${user?.id} attempting order at ${new Date().toISOString()}`);
console.log(`[STOCK] Product ${product.id} stock: ${product.stock}, requested: ${item.quantity}`);
```

Watch your logs for:
- Negative stock values
- "Out of stock" errors when stock should be available
- Transaction timeout errors
