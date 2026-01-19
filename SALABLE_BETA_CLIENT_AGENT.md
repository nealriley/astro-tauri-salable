# Salable Beta Integration Guide

This file provides guidance for AI agents (Claude Code, ChatGPT, etc.) working with the Salable billing/subscription API.

---

## BETA RECOMMENDATIONS

**Free tiers must have a price.** Set `unitAmount: 0` (zero cents) for free plans. Do not omit pricing or line items. This ensures Stripe integration works correctly. This workaround will be removed when the bug is fixed.

---

## API Key Setup (REQUIRED FIRST STEP)

Before any API calls, the agent MUST:

1. Check for `SALABLE_API_KEY` environment variable or `.env` file
2. If missing, tell user:
   ```
   Set SALABLE_API_KEY in your .env file.
   Get key from: https://beta.salable.app/ -> Settings -> API Keys
   ```
3. Confirm environment: "Is this a TEST or LIVE key?"

---

# PART 1: FROM IDEA TO PRODUCT

This section guides you through the thinking process before touching the API. Getting this right saves significant rework later.

---

## The Product Monetization Canvas

Before creating anything in Salable, answer these five questions:

### 1. What Are You Selling?

Define the core value proposition in one sentence:

> "[Product Name] helps [target customer] to [solve problem] by [how it works]."

**Examples:**
- "Acme Analytics helps marketing teams understand campaign ROI by tracking conversions across channels."
- "CodeReview Pro helps development teams ship better code by providing AI-powered code analysis."

### 2. Who Pays vs Who Uses?

This is critical for identity mapping:

| Question | Answer | Salable Concept |
|----------|--------|-----------------|
| Who receives the invoice? | Company, Organization, Account | `owner` |
| Who logs in and uses the product? | User, Team Member, Seat | `granteeId` |

**Common Patterns:**

| Business Model | Owner | Grantee |
|----------------|-------|---------|
| B2B SaaS | `org_123` (company) | `user_456` (employee) |
| B2C SaaS | `user_123` (individual) | `user_123` (same person) |
| Marketplace | `seller_123` (merchant) | `seller_123` (same) |
| Agency | `agency_123` (agency) | `client_456` (client workspace) |

**Key Insight:** One owner can have multiple grantees. An organization pays once but grants access to many users.

### 3. What Differentiates Your Tiers?

List every feature that could vary between plans:

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Basic dashboard | ✓ | ✓ | ✓ |
| API access | - | ✓ | ✓ |
| SSO/SAML | - | - | ✓ |
| Priority support | - | ✓ | ✓ |
| Custom domains | - | - | ✓ |

Each ✓ becomes an **entitlement**. Name them using `snake_case`:
- `basic_dashboard`
- `api_access`
- `sso_saml`
- `priority_support`
- `custom_domains`

### 4. How Do You Charge?

Select your primary monetization strategy:

| Strategy | When to Use | Salable Implementation |
|----------|-------------|------------------------|
| **Flat-rate** | Simple product, predictable value | Single `flat_rate` line item |
| **Per-seat** | Value scales with team size | `per_seat` line item with min/max |
| **Usage-based** | Value tied to consumption | `metered` line item + meter |
| **Feature-gated** | Different features at each tier | Multiple plans with different entitlements |
| **Hybrid** | Platform fee + variable usage | Multiple line items per plan |

**Decision Tree:**
```
Does value increase with more users?
├── Yes → Per-seat pricing
└── No → Does usage vary significantly?
    ├── Yes → Usage-based or hybrid
    └── No → Flat-rate or feature-gated
```

### 5. What's Your Pricing Structure?

For each plan, define:

| Plan | Price | Interval | Target Customer |
|------|-------|----------|-----------------|
| Free | $0/mo | Monthly | Individuals, trial users |
| Pro | $29/mo | Monthly | Small teams |
| Business | $99/mo | Monthly | Growing companies |
| Enterprise | Custom | Annual | Large organizations |

**Annual Discount Convention:** Typically 15-20% off monthly rate (e.g., $29/mo = $290/yr instead of $348/yr).

---

## The Product Specification Template

Before building, fill out this template:

```markdown
# [Product Name] - Salable Specification

## Identity Mapping
- Owner ID source: [your system's org/account ID field]
- Grantee ID source: [your system's user/member ID field]

## Entitlements (features that vary by plan)
1. [entitlement_name] - [description]
2. [entitlement_name] - [description]
...

## Meters (if usage-based)
1. [meter_slug] - [what it measures] - [unit]
...

## Plans

### [Plan Name]
- Price: $X/[interval]
- Entitlements: [list]
- Line items: [flat_rate/per_seat/metered details]
- Target: [customer segment]

### [Plan Name]
...
```

---

# PART 2: SALABLE CONCEPT MAP

Understanding how business concepts map to Salable's API is essential for correct implementation.

---

## Entity Relationships

```
Organization (your Salable account)
│
├── Entitlements (org-level, reusable across products)
│   ├── api_access
│   ├── sso_saml
│   └── priority_support
│
├── Meters (org-level, reusable across products)
│   ├── api_calls
│   └── storage_gb
│
└── Products
    ├── Product A
    │   ├── Plan: Free
    │   │   ├── Entitlements: [basic_access]
    │   │   └── Line Items: [$0/mo flat_rate]
    │   │
    │   └── Plan: Pro
    │       ├── Entitlements: [basic_access, api_access, priority_support]
    │       └── Line Items: [$29/mo flat_rate]
    │
    └── Product B
        └── Plan: Starter
            ├── Entitlements: [basic_access, api_access] (reused!)
            └── Line Items: [$19/mo flat_rate + metered api_calls]
```

---

## Concept Glossary

| Business Term | Salable Entity | Scope | Description |
|--------------|----------------|-------|-------------|
| Your SaaS product | **Product** | Product-level | Container for plans |
| Pricing tier | **Plan** | Product-level | Combines entitlements + pricing |
| Feature flag | **Entitlement** | Org-level | Boolean access gate, reusable |
| Usage metric | **Meter** | Org-level | Tracks consumption, reusable |
| Pricing configuration | **Line Item** | Plan-level | How much to charge |
| Price point | **Price** | Line Item-level | Amount per interval/currency |
| Company/Account | **Owner** | Subscription-level | Who pays |
| User/Seat | **Grantee** | Subscription-level | Who uses |
| Active subscription | **Subscription** | Owner-level | Links owner to plan |

---

## Scope Implications

**Org-Level (reusable across all products):**
- Entitlements
- Meters

**Product-Level:**
- Plans
- Line Items

**Why This Matters:**
- Create entitlements ONCE, use in MANY products
- Create meters ONCE, reference in MANY line items
- Deleting a product does NOT delete its entitlements
- Check existing entitlements before creating new ones to avoid duplicates

---

# PART 3: BUILD ORDER (Critical Dependencies)

The order of operations matters. Creating resources in the wrong order will fail.

---

## Dependency Graph

```
Entitlements ──────────────────────────────────┐
(must exist before plans reference them)       │
                                               ▼
Meters ────────────────────────────────┐     Plans
(must exist before line items          │  (created via /api/plans/save)
reference them via meterSlug)          │       │
                                       │       │
                           ┌───────────┴───────┘
                           ▼
                      Line Items
                    (nested in plan creation)
                           │
                           ▼
                     Subscriptions
                    (created via checkout)
                           │
                           ▼
                  Entitlement Checks
                 (in your application)
```

---

## The Correct Build Sequence

### Phase 1: Foundation (Org-Level Resources)

These are reusable and should be created thoughtfully.

**Step 1.1: Audit Existing Entitlements**

Before creating new entitlements, check what already exists:

```bash
curl -s "https://beta.salable.app/api/entitlements" \
  -H "Authorization: Bearer $SALABLE_API_KEY" | jq '.data[] | {id, name}'
```

**Step 1.2: Create Missing Entitlements**

Only create entitlements that don't already exist:

```bash
curl -s -X POST "https://beta.salable.app/api/entitlements" \
  -H "Authorization: Bearer $SALABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "feature_name"}'
```

**Naming Rules:**
- Pattern: `^[a-z]+(_[a-z]+)*$`
- Good: `api_access`, `sso_saml`, `priority_support`
- Bad: `API-Access`, `ssoSaml`, `Priority Support`

**Step 1.3: Audit Existing Meters**

```bash
curl -s "https://beta.salable.app/api/meters" \
  -H "Authorization: Bearer $SALABLE_API_KEY" | jq '.data[] | {id, slug, name}'
```

**Step 1.4: Create Missing Meters (if usage-based)**

```bash
curl -s -X POST "https://beta.salable.app/api/meters" \
  -H "Authorization: Bearer $SALABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "API Calls", "slug": "api_calls"}'
```

### Phase 2: Product Structure

**Step 2.1: Create Product**

```bash
curl -s -X POST "https://beta.salable.app/api/products" \
  -H "Authorization: Bearer $SALABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Your Product Name"}'
```

Save the returned `id` - you'll need it for all plans.

**Step 2.2: Create Plans**

Use `/api/plans/save` (NOT `/api/plans`) to create plans with full configuration:

```bash
curl -s -X POST "https://beta.salable.app/api/plans/save" \
  -H "Authorization: Bearer $SALABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "<product_id>",
    "name": "Pro",
    "entitlements": ["<ent_id_1>", "<ent_id_2>"],
    "lineItems": [{
      "name": "Pro Monthly",
      "slug": "pro_monthly",
      "priceType": "flat_rate",
      "intervalType": "recurring",
      "billingScheme": "flat_rate",
      "isActive": true,
      "minQuantity": 1,
      "maxQuantity": 1,
      "tiersMode": null,
      "meterSlug": null,
      "prices": [{
        "defaultCurrency": "USD",
        "interval": "month",
        "intervalCount": 1,
        "currencyOptions": [
          {"currency": "USD", "unitAmount": 2900}
        ]
      }]
    }]
  }'
```

### Phase 3: Go-Live Infrastructure

**Step 3.1: Register Webhooks**

```bash
curl -s -X POST "https://beta.salable.app/api/webhooks" \
  -H "Authorization: Bearer $SALABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/webhooks/salable",
    "events": ["subscription_created", "subscription_updated", "subscription_cancelled"]
  }'
```

**Step 3.2: Generate Checkout Links**

Option A - Direct plan checkout:

```bash
curl -s "https://beta.salable.app/api/plans/<plan_id>/checkout-link?granteeId=<grantee>&owner=<owner>&successUrl=https://app.com/success&cancelUrl=https://app.com/cancel" \
  -H "Authorization: Bearer $SALABLE_API_KEY"
```

Option B - Cart API (for multiple items): See Cart API section below.

### Phase 4: Application Integration

**Step 4.1: Implement Entitlement Checks**

In your application, check entitlements before allowing feature access:

```bash
curl -s "https://beta.salable.app/api/entitlements/check?granteeId=<user_id>" \
  -H "Authorization: Bearer $SALABLE_API_KEY"
```

Response includes all entitlements the grantee has access to.

**Step 4.2: Handle Webhook Events**

Process these events in your webhook handler:
- `subscription_created` - Grant access, send welcome email
- `subscription_updated` - Update access level
- `subscription_cancelled` - Revoke access, send offboarding email

---

## Build Order Checklist

Use this checklist for every new product:

```markdown
## Pre-Build
- [ ] Completed Product Monetization Canvas
- [ ] Filled out Product Specification Template
- [ ] Confirmed TEST vs LIVE environment

## Phase 1: Foundation
- [ ] Audited existing entitlements
- [ ] Created only NEW entitlements needed
- [ ] Audited existing meters
- [ ] Created only NEW meters needed (if usage-based)
- [ ] Recorded all entitlement IDs
- [ ] Recorded all meter slugs

## Phase 2: Product
- [ ] Created product
- [ ] Recorded product ID
- [ ] Created FREE plan (if applicable) with $0 line item
- [ ] Created paid plans with correct entitlements
- [ ] Verified plans via GET /api/plans

## Phase 3: Infrastructure
- [ ] Registered webhook endpoint
- [ ] Tested webhook delivery
- [ ] Generated test checkout link
- [ ] Completed test checkout with card 4242...

## Phase 4: Integration
- [ ] Implemented entitlement check in app
- [ ] Implemented webhook handler
- [ ] Tested full flow: checkout → webhook → entitlement check
```

---

# PART 4: API REFERENCE

---

## API Basics

| Setting | Value |
|---------|-------|
| Base URL | `https://beta.salable.app` |
| Auth Header | `Authorization: Bearer <API_KEY>` |
| Content-Type | `application/json` |

### Key Points

- Use `/api/plans/save` (not `/api/plans`) for creating plans with full config
- Entitlement names must match pattern `^[a-z]+(_[a-z]+)*$`
- Free plans require `unitAmount: 0` (not omitted) - beta workaround
- Create meters before referencing them in line items via `meterSlug`
- Do NOT include `isDefault` in `currencyOptions` when creating resources

---

## Verified API Endpoints

### Products

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/api/products` |
| Create | POST | `/api/products` |
| Get | GET | `/api/products/{id}` |
| Delete | DELETE | `/api/products/{id}` |

### Plans

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/api/plans` |
| Get | GET | `/api/plans/{id}` |
| Get expanded | GET | `/api/plans/{id}?expand=entitlements,lineItems` |
| **Save (full config)** | POST | `/api/plans/save` |
| Checkout link | GET | `/api/plans/{id}/checkout-link` |

### Entitlements

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/api/entitlements` |
| Create | POST | `/api/entitlements` |
| Check access | GET | `/api/entitlements/check` |

### Line Items

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/api/line-items` |
| Get | GET | `/api/line-items/{id}` |

### Meters

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/api/meters` |
| Create | POST | `/api/meters` |

### Subscriptions

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/api/subscriptions` |
| Get | GET | `/api/subscriptions/{id}` |
| Cancel | PUT | `/api/subscriptions/{id}/cancel` |

### Webhooks

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/api/webhooks` |
| Create | POST | `/api/webhooks` |
| Delete | DELETE | `/api/webhooks/{id}` |

### Carts (Checkout Flow)

| Action | Method | Path |
|--------|--------|------|
| Create | POST | `/api/carts` |
| Add item | POST | `/api/cart-items` |
| Generate checkout | POST | `/api/carts/{cartId}/checkout` |

---

## Webhook Events Reference

| Event | Fires When | Your Action |
|-------|------------|-------------|
| `subscription_created` | New subscription via checkout | Grant access, welcome email |
| `subscription_updated` | Plan change, seat change, etc. | Update access level |
| `subscription_cancelled` | Subscription cancelled | Revoke access, offboarding |
| `usage_finalised` | Billing cycle ends | Record final usage |
| `usage_recorded` | Usage event recorded | Update usage display |
| `receipt_created` | Invoice generated | Send receipt |
| `owner_updated` | Owner details changed | Update billing info |

---

# PART 5: PRICING MODELS & LINE ITEM EXAMPLES

---

## Common Commercial Models

### Freemium (Free + Paid tiers)
```
Free: $0/mo, limited features
Pro: $25/mo, all features
```
**Implementation:** Create both plans, set Free plan `unitAmount: 0`.

### Flat-Rate Subscription
```
Single plan: $49/mo or $490/yr
```
**Implementation:** One plan with two price intervals (month + year).

### Per-Seat Pricing
```
$10/user/month, min 1, max 100
```
**Implementation:** Use `priceType: "per_seat"` with `minQuantity`/`maxQuantity`.

### Usage-Based (Metered)
```
$0.01 per API call, billed monthly
```
**Implementation:** Create meter first, then use `priceType: "metered"` with `meterSlug`.

### Hybrid (Base + Usage)
```
$50/mo base + $0.001 per request
```
**Implementation:** Two line items in one plan - `flat_rate` + `metered`.

### Tiered Pricing
```
0-100 units: $10/unit
101-500 units: $8/unit
501+ units: $5/unit
```
**Implementation:** Use `billingScheme: "tiered"` with `tiersMode: "graduated"` or `"volume"`.

---

## Line Item Configuration

### Price Types

| Type | Use Case | Requires |
|------|----------|----------|
| `flat_rate` | Fixed subscription fee | Nothing extra |
| `per_seat` | Per-user pricing | `minQuantity`, `maxQuantity` |
| `metered` | Usage-based billing | `meterSlug` (meter must exist) |

### Interval Types

| Type | Use Case |
|------|----------|
| `recurring` | Monthly/yearly subscriptions |
| `one_off` | Setup fees, one-time charges |

### Billing Schemes

| Scheme | Use Case |
|--------|----------|
| `flat_rate` | Single fixed price |
| `per_unit` | Price multiplied by quantity |
| `tiered` | Volume/graduated pricing |

### Tier Modes (when `billingScheme: "tiered"`)

| Mode | Behavior |
|------|----------|
| `graduated` | Each tier priced separately (like tax brackets) |
| `volume` | All units priced at highest reached tier |

---

## Full Line Item Examples

### Flat Rate Monthly ($29/mo)

```json
{
  "name": "Pro Monthly",
  "slug": "pro_monthly",
  "priceType": "flat_rate",
  "intervalType": "recurring",
  "billingScheme": "flat_rate",
  "isActive": true,
  "minQuantity": 1,
  "maxQuantity": 1,
  "tiersMode": null,
  "meterSlug": null,
  "prices": [{
    "defaultCurrency": "USD",
    "interval": "month",
    "intervalCount": 1,
    "currencyOptions": [
      {"currency": "USD", "unitAmount": 2900}
    ]
  }]
}
```

### Free Tier (BETA: must have $0 price)

```json
{
  "name": "Free Monthly",
  "slug": "free_monthly",
  "priceType": "flat_rate",
  "intervalType": "recurring",
  "billingScheme": "flat_rate",
  "isActive": true,
  "minQuantity": 1,
  "maxQuantity": 1,
  "tiersMode": null,
  "meterSlug": null,
  "prices": [{
    "defaultCurrency": "USD",
    "interval": "month",
    "intervalCount": 1,
    "currencyOptions": [
      {"currency": "USD", "unitAmount": 0}
    ]
  }]
}
```

### Per-Seat Pricing ($10/seat/mo)

```json
{
  "name": "Team Seats",
  "slug": "team_seats",
  "priceType": "per_seat",
  "intervalType": "recurring",
  "billingScheme": "per_unit",
  "isActive": true,
  "minQuantity": 1,
  "maxQuantity": 100,
  "tiersMode": null,
  "meterSlug": null,
  "prices": [{
    "defaultCurrency": "USD",
    "interval": "month",
    "intervalCount": 1,
    "currencyOptions": [
      {"currency": "USD", "unitAmount": 1000}
    ]
  }]
}
```

### Metered Usage ($0.01/call)

```json
{
  "name": "API Calls",
  "slug": "api_calls",
  "priceType": "metered",
  "intervalType": "recurring",
  "billingScheme": "per_unit",
  "isActive": true,
  "minQuantity": 0,
  "maxQuantity": 999999,
  "tiersMode": null,
  "meterSlug": "api_calls",
  "prices": [{
    "defaultCurrency": "USD",
    "interval": "month",
    "intervalCount": 1,
    "currencyOptions": [
      {"currency": "USD", "unitAmount": 1}
    ]
  }]
}
```

### One-Time Setup Fee ($500)

```json
{
  "name": "Setup Fee",
  "slug": "setup_fee",
  "priceType": "flat_rate",
  "intervalType": "one_off",
  "billingScheme": "flat_rate",
  "isActive": true,
  "minQuantity": 1,
  "maxQuantity": 1,
  "tiersMode": null,
  "meterSlug": null,
  "prices": [{
    "defaultCurrency": "USD",
    "interval": null,
    "intervalCount": null,
    "currencyOptions": [
      {"currency": "USD", "unitAmount": 50000}
    ]
  }]
}
```

### Annual Plan with Discount ($290/yr = ~$24/mo)

```json
{
  "name": "Pro Annual",
  "slug": "pro_annual",
  "priceType": "flat_rate",
  "intervalType": "recurring",
  "billingScheme": "flat_rate",
  "isActive": true,
  "minQuantity": 1,
  "maxQuantity": 1,
  "tiersMode": null,
  "meterSlug": null,
  "prices": [{
    "defaultCurrency": "USD",
    "interval": "year",
    "intervalCount": 1,
    "currencyOptions": [
      {"currency": "USD", "unitAmount": 29000}
    ]
  }]
}
```

---

## Multi-Currency Support

Add multiple currencies to `currencyOptions`:

```json
"currencyOptions": [
  {"currency": "USD", "unitAmount": 2900},
  {"currency": "GBP", "unitAmount": 2300},
  {"currency": "EUR", "unitAmount": 2700},
  {"currency": "CAD", "unitAmount": 3900},
  {"currency": "AUD", "unitAmount": 4400}
]
```

**Note:** Prices are in cents. $29.00 = `2900`.

---

# PART 6: CHECKOUT & TESTING

---

## Checkout Flow (Cart API)

1. **Create cart:** `POST /api/carts` with owner, interval, currency
2. **Add items:** `POST /api/cart-items` with planId, cartId, grantee
3. **Generate link:** `POST /api/carts/{cartId}/checkout` with successUrl, cancelUrl

### Full Example

```bash
# Create cart
CART_RESPONSE=$(curl -s -X POST "https://beta.salable.app/api/carts" \
  -H "Authorization: Bearer $SALABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "org_123",
    "interval": "month",
    "intervalCount": 1,
    "currency": "USD"
  }')

CART_ID=$(echo $CART_RESPONSE | jq -r '.data.id')

# Add plan to cart
curl -s -X POST "https://beta.salable.app/api/cart-items" \
  -H "Authorization: Bearer $SALABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"planId\": \"plan_xxx\",
    \"cartId\": \"$CART_ID\",
    \"grantee\": \"user_456\",
    \"interval\": \"month\",
    \"intervalCount\": 1
  }"

# Generate checkout link
curl -s -X POST "https://beta.salable.app/api/carts/$CART_ID/checkout" \
  -H "Authorization: Bearer $SALABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "successUrl": "https://app.com/success",
    "cancelUrl": "https://app.com/cancel"
  }' | jq -r '.data.url'
```

---

## Test Cards (TEST MODE ONLY)

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 3220` | Requires 3D Secure |

**For all test cards:**
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any valid ZIP (e.g., `12345`)

---

# PART 7: COMMON PITFALLS & TROUBLESHOOTING

---

## Common Pitfalls

1. **Do NOT include `isDefault` in `currencyOptions`** - Returned in responses, rejected in requests.
2. **Check existing entitlements first** - `GET /api/entitlements` before creating to avoid duplicates.
3. **Use `/api/plans/save` not `/api/plans`** - Only the save endpoint accepts full nested config.
4. **Create meter before referencing** - `POST /api/meters` before using `meterSlug` in line items.
5. **Entitlement names are lowercase with underscores** - Pattern: `^[a-z]+(_[a-z]+)*$`
6. **Free plans need $0 price** - Don't omit line items; set `unitAmount: 0`.
7. **Entitlements are org-level** - Deleting a product doesn't delete its entitlements.
8. **Order matters** - Entitlements and meters must exist before plans reference them.
9. **Test vs Live** - Always confirm which environment you're in before making changes.

---

## Troubleshooting

### "Unauthenticated" Error
- Check `SALABLE_API_KEY` is set correctly
- Verify key hasn't expired

### Plan Creation Fails
- Verify all entitlement IDs exist: `GET /api/entitlements`
- Verify meter slug exists (if metered): `GET /api/meters`
- Use `/api/plans/save` not `/api/plans`
- Check entitlement name format: `^[a-z]+(_[a-z]+)*$`

### Checkout Link Doesn't Work
- Verify plan ID is correct
- Check successUrl and cancelUrl are valid URLs
- Ensure owner and granteeId are provided

### Webhooks Not Received
- Verify webhook URL is publicly accessible
- Verify webhook is registered: `GET /api/webhooks`
- Check for events filter mismatch

### Entitlements Not Showing
- Verify subscription was created (check webhooks)
- Check granteeId matches what was used at checkout
- Verify entitlements were assigned to the plan

---

# PART 8: TEARDOWN & CLEANUP

---

## Teardown / Cleanup

When you need to "tear down" or "clean up" a product demo:

### Step 1: List and Cancel Subscriptions

```bash
# List subscriptions
curl -s "https://beta.salable.app/api/subscriptions" \
  -H "Authorization: Bearer $SALABLE_API_KEY" | jq '.data[] | {id, status}'

# Cancel each active subscription
curl -s -X PUT "https://beta.salable.app/api/subscriptions/<subscription_id>/cancel" \
  -H "Authorization: Bearer $SALABLE_API_KEY"
```

### Step 2: Delete Webhook Destinations

```bash
# List webhooks
curl -s "https://beta.salable.app/api/webhooks" \
  -H "Authorization: Bearer $SALABLE_API_KEY" | jq '.data[] | {id, url}'

# Delete each webhook
curl -s -X DELETE "https://beta.salable.app/api/webhooks/<webhook_id>" \
  -H "Authorization: Bearer $SALABLE_API_KEY"
```

### Step 3: Delete Product (includes plans)

```bash
curl -s -X DELETE "https://beta.salable.app/api/products/<product_id>" \
  -H "Authorization: Bearer $SALABLE_API_KEY"
```

### Teardown Checklist

- [ ] All subscriptions cancelled
- [ ] All webhook destinations deleted
- [ ] Product deleted

**Note:** Entitlements and meters are org-level resources and persist across products. Only delete them if they are no longer needed by ANY product.

---

# APPENDIX: AGENT WORKFLOW SUMMARY

For AI agents, here's the complete workflow:

## When User Wants to Create a New Product

1. **Discovery Phase**
   - Ask the 5 Product Monetization Canvas questions
   - Help fill out the Product Specification Template
   - Confirm TEST vs LIVE environment

2. **Audit Phase**
   - Check existing entitlements: `GET /api/entitlements`
   - Check existing meters: `GET /api/meters`
   - Identify what needs to be created vs reused

3. **Build Phase** (in order!)
   - Create missing entitlements
   - Create missing meters (if usage-based)
   - Create product
   - Create plans via `/api/plans/save`

4. **Infrastructure Phase**
   - Register webhooks
   - Generate test checkout link
   - Guide user through test checkout

5. **Verification Phase**
   - Verify webhook received
   - Verify entitlements granted
   - Confirm full flow works

## Key Reminders for Agents

- Always check existing resources before creating
- Always create entitlements/meters BEFORE plans
- Always use `/api/plans/save` for full config
- Always set `unitAmount: 0` for free plans (not omitted)
- Never include `isDefault` in currencyOptions
- Confirm environment (TEST/LIVE) before any changes
