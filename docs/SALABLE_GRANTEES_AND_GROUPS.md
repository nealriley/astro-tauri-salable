# Salable Beta: Grantees, Groups & Access Control

This document explains how Salable Beta manages access control through Grantees and Groups, and why subscriptions may appear to have `granteeId: null`.

---

## Key Insight: Subscriptions Don't Directly Link to Grantees

In Salable Beta, **subscriptions are NOT directly linked to grantees**. Instead, access flows through **Groups**:

```
Owner (pays for subscription)
  └─ Subscription
      └─ Subscription Plans (one per Plan purchased)
          └─ Group (collection of grantees)
              └─ Grantees (individual users who get access)
```

This is why when you query a subscription, `granteeId` is `null` - subscriptions link to Groups, not individual Grantees.

---

## The Relationship Model

| Entity | Description | Scope |
|--------|-------------|-------|
| **Owner** | Who pays for the subscription | Scopes subscriptions, carts, usage |
| **Subscription** | The billing relationship | Belongs to Owner |
| **Subscription Plan** | A plan within a subscription | Links to a Group |
| **Group** | Collection of grantees | Belongs to Owner, links to Subscription Plans |
| **Grantee** | Individual user who gets access | Can belong to multiple Groups |
| **Membership** | Join record linking Grantee to Group | Many-to-many relationship |

---

## How Access Works

When checking if a grantee has access (`GET /api/entitlements/check?granteeId=X`):

1. Find all Groups the Grantee belongs to (via Memberships)
2. Find all Subscription Plans attached to those Groups
3. Check if those Plans include the requested Entitlement
4. Validate Subscriptions are active
5. Return entitlements with expiry dates

---

## Why Our Subscriptions Have No Grantees

Our current checkout flow creates subscriptions but doesn't properly link grantees to groups. Here's what happens:

### Current Flow (Broken)
```
1. POST /api/carts (owner: "user1")
2. POST /api/cart-items (planId, cartId, grantee: "user1")
3. POST /api/carts/{cartId}/checkout
4. User completes Stripe payment
5. Subscription created ✓
6. Group created (empty or with grantee not linked) ✗
7. Grantee has no entitlements ✗
```

### What Should Happen

**Option A: Create Group Before Checkout**
```
1. POST /api/groups (owner: "user1", grantees: [{granteeId: "user1"}])
2. POST /api/carts (owner: "user1")
3. POST /api/cart-items (planId, cartId, groupId: "grp_xxx")
4. POST /api/carts/{cartId}/checkout
5. Subscription links to existing Group with Grantee
```

**Option B: Let Checkout Create Group, Then Add Grantee**
```
1. POST /api/carts (owner: "user1")
2. POST /api/cart-items (planId, cartId, grantee: "user1")
3. POST /api/carts/{cartId}/checkout
4. After checkout, find the created Group
5. POST /api/groups/{groupId}/grantees [{type: "add", granteeId: "user1"}]
```

---

## Individual vs Team Subscriptions

### Individual (B2C) - Same ID for Owner and Grantee
```javascript
// Create group with user as both owner and grantee
POST /api/groups
{
  "owner": "user_123",
  "name": "User 123's Subscription",
  "grantees": [{ "granteeId": "user_123", "name": "John Doe" }]
}
```

### Team (B2B) - Organization owns, users get access
```javascript
POST /api/groups
{
  "owner": "org_acme",
  "name": "Acme Corp Team",
  "grantees": [
    { "granteeId": "user_alice", "name": "Alice" },
    { "granteeId": "user_bob", "name": "Bob" }
  ]
}
```

---

## Fixing Our Implementation

### Option 1: Pre-create Groups (Recommended for B2C)

Before checkout, create a group with the user:

```typescript
// In checkout.json.ts, before creating cart:

// Step 0: Create group with grantee
const groupResponse = await fetch(`${SALABLE_API_URL}/groups`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    owner: owner,
    name: `${granteeId}'s Subscription`,
    grantees: [{ granteeId: granteeId }]
  }),
});
const groupData = await groupResponse.json();
const groupId = groupData.data.id;

// Step 2: Add item to cart with groupId
const itemResponse = await fetch(`${SALABLE_API_URL}/cart-items`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    planId,
    cartId,
    groupId: groupId,  // Use groupId instead of grantee
    interval: 'month',
    intervalCount: 1,
  }),
});
```

### Option 2: Post-checkout Webhook Handler

Handle `subscription.created` webhook to add grantee to group:

```typescript
// In webhook handler:
if (event.type === 'subscription.created') {
  const subscription = event.data;
  // Find the group created for this subscription
  // Add the grantee to the group
}
```

---

## API Reference

### Create Group
```bash
POST /api/groups
{
  "owner": "user_123",
  "name": "Optional Group Name",
  "grantees": [
    { "granteeId": "user_123", "name": "Optional Display Name" }
  ]
}
```

### Add Grantee to Group
```bash
POST /api/groups/{groupId}/grantees
[
  { "type": "add", "granteeId": "user_456", "name": "New User" }
]
```

### Remove Grantee from Group
```bash
POST /api/groups/{groupId}/grantees
[
  { "type": "remove", "granteeId": "user_456" }
]
```

### Check Entitlements
```bash
GET /api/entitlements/check?granteeId=user_123
# Optional: filter by owner
GET /api/entitlements/check?granteeId=user_123&owner=org_acme
```

---

## Troubleshooting

### Grantee Has No Access
1. Verify grantee exists: `GET /api/grantees?granteeId=X`
2. Check grantee's group memberships
3. Verify groups have active subscription plans
4. Check subscription status (active, trialing)
5. Confirm plans include the entitlement

### Subscription Has No Grantees
- This is expected! Subscriptions link to Groups, not Grantees
- Check the Subscription's Groups for members
- Use dashboard: Groups → Manage Group → see members

---

## References

- [Grantees & Groups Documentation](https://beta.salable.app/docs/grantee-groups)
- [Cart & Checkout Documentation](https://beta.salable.app/docs/cart-and-checkout)
- [Subscriptions & Billing Documentation](https://beta.salable.app/docs/subscriptions-and-billing)
