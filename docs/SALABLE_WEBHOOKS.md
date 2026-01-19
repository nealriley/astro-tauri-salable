# Salable Beta: Webhooks Reference

This document covers webhook implementation for Salable Beta.

---

## Overview

Webhooks are HTTP callbacks that Salable sends when events occur. They provide real-time notifications about subscription changes, usage updates, and payment events.

---

## Available Event Types

| Event | Fires When | Your Action |
|-------|------------|-------------|
| `subscription.created` | Customer completes checkout | Grant access, send welcome email |
| `subscription.updated` | Plan change, quantity change, status change | Update access level |
| `subscription.cancelled` | Subscription ends | Revoke access, send offboarding |
| `usage.recorded` | Usage cycle processes | Update usage display |
| `usage.finalised` | Usage subscription ends | Record final usage |
| `receipt.created` | One-off purchase completes | Send receipt |
| `owner.updated` | Owner email updated | Update customer records |

---

## Creating Webhook Destinations

### Via Dashboard
1. Navigate to **Webhooks** in sidebar
2. Click **Create Webhook**
3. Enter your endpoint URL (must be HTTPS)
4. Select event types to receive
5. Copy the **signing secret** (store securely!)

### Via API
```bash
POST /api/webhooks
{
  "url": "https://yourapp.com/webhooks/salable",
  "events": ["subscription.created", "subscription.updated", "subscription.cancelled"]
}
```

---

## Webhook Handler Implementation

### Requirements
- Respond within **15 seconds** (or delivery marked failed)
- Return **2xx status code** for success
- Verify signature before processing
- Handle POST requests only

### Basic Handler (Node.js/Express)

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

export async function handleWebhook(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-salable-signature'];
    const timestamp = req.headers['x-salable-timestamp'];
    const body = req.body;

    // Verify signature
    if (!verifySignature(body, timestamp, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, data } = body;

    // Process event
    switch (type) {
      case 'subscription.created':
        await handleSubscriptionCreated(data);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(data);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(data);
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Processing failed' });
  }
}
```

### Signature Verification

```typescript
function verifySignature(body: any, timestamp: string, signature: string): boolean {
  const secret = process.env.SALABLE_WEBHOOK_SECRET;

  // Check timestamp (5 minute window)
  const currentTime = new Date();
  const requestTime = new Date(timestamp);
  const timeWindow = 5 * 60 * 1000; // 5 minutes

  if (Math.abs(currentTime.getTime() - requestTime.getTime()) > timeWindow) {
    return false;
  }

  // Construct signed payload
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  const payload = `${timestamp}.${rawBody}`;

  // Compute expected signature
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest();

  // Constant-time comparison
  return timingSafeEqual(
    expectedSignature,
    Buffer.from(signature, 'hex')
  );
}
```

---

## Astro API Route Example

```typescript
// src/pages/api/webhooks/salable.ts
import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'crypto';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('x-salable-signature');
  const timestamp = request.headers.get('x-salable-timestamp');
  
  if (!signature || !timestamp) {
    return new Response(JSON.stringify({ error: 'Missing headers' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.text();
  
  if (!verifySignature(body, timestamp, signature)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const event = JSON.parse(body);
  
  // Process event...
  console.log('Received webhook:', event.type);

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

function verifySignature(body: string, timestamp: string, signature: string): boolean {
  const secret = import.meta.env.SALABLE_WEBHOOK_SECRET;
  
  // Timestamp check
  const currentTime = Date.now();
  const requestTime = new Date(timestamp).getTime();
  if (Math.abs(currentTime - requestTime) > 5 * 60 * 1000) {
    return false;
  }

  // Signature check
  const payload = `${timestamp}.${body}`;
  const expected = createHmac('sha256', secret).update(payload).digest();
  
  try {
    return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}
```

---

## Retry Behavior

- **Up to 10 automatic retries** with exponential backoff
- After 10 failures, manual resend required via dashboard
- Failed deliveries show error messages in dashboard

---

## Testing Webhooks

### Test Mode
- Create webhook destinations in Test Mode
- Only receives events from Test Mode actions
- Separate signing secrets from production

### Local Development
Use a tunnel service to expose localhost:
```bash
# ngrok
ngrok http 4321

# Then use the ngrok URL as webhook destination
# https://abc123.ngrok.io/api/webhooks/salable
```

---

## Troubleshooting

### Signature Verification Fails
- Verify correct signing secret from dashboard
- Payload format: `${timestamp}.${rawBody}`
- Use raw body string, not parsed JSON
- Use `timingSafeEqual` for comparison

### Timeouts
- Handler must respond within 15 seconds
- Move heavy processing to background jobs
- Return 200 immediately, process async

### Events Not Arriving
- Check webhook destination event types
- Verify URL is publicly accessible (HTTPS)
- Check delivery history in dashboard

---

## References

- [Webhooks Documentation](https://beta.salable.app/docs/webhooks)
- [Testing & Development](https://beta.salable.app/docs/testing-and-development)
