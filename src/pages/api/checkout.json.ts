import type { APIRoute } from 'astro';

export const prerender = false;

const SALABLE_API_URL = 'https://beta.salable.app/api';

export const POST: APIRoute = async ({ request, url }) => {
  const apiKey = import.meta.env.SALABLE_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'SALABLE_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { planId, granteeId, owner } = body;

    if (!planId || !granteeId || !owner) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: planId, granteeId, owner' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build success/cancel URLs
    const baseUrl = url.origin;
    const successUrl = `${baseUrl}/success?granteeId=${encodeURIComponent(granteeId)}`;
    const cancelUrl = `${baseUrl}/pricing`;

    // Step 1: Create a Group for the subscription
    // We create the group first, then add the grantee separately
    // This handles the case where the grantee already exists in the system
    let groupId: string;
    
    const groupResponse = await fetch(`${SALABLE_API_URL}/groups`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        owner,
        name: `${granteeId}'s Subscription`,
      }),
    });

    if (!groupResponse.ok) {
      const errorText = await groupResponse.text();
      let errorData: { title?: string; detail?: string } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { title: errorText };
      }
      console.error('Salable group creation error:', {
        status: groupResponse.status,
        error: errorData,
        owner,
        granteeId,
      });
      return new Response(
        JSON.stringify({ 
          error: errorData.detail || errorData.title || 'Failed to create group',
          details: errorData
        }),
        { status: groupResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const groupData = await groupResponse.json();
    groupId = groupData.data.id;
    console.log('Created group:', groupId, 'for owner:', owner);

    // Step 1b: Add grantee to the group
    // This is done separately to handle existing grantees
    const addGranteeResponse = await fetch(`${SALABLE_API_URL}/groups/${groupId}/grantees`, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        {
          type: 'add',
          granteeId: granteeId,
          name: granteeId,
        }
      ]),
    });

    if (!addGranteeResponse.ok) {
      const errorText = await addGranteeResponse.text();
      let errorData: { title?: string; detail?: string } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { title: errorText };
      }
      console.error('Salable add grantee error:', {
        status: addGranteeResponse.status,
        error: errorData,
        groupId,
        granteeId,
      });
      // Don't fail the whole checkout, just log the error
      // The group exists, we can proceed
      console.warn('Failed to add grantee to group, proceeding with checkout');
    } else {
      console.log('Added grantee:', granteeId, 'to group:', groupId);
    }

    // Step 2: Create cart
    const cartResponse = await fetch(`${SALABLE_API_URL}/carts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        owner,
        interval: 'month',
        intervalCount: 1,
        currency: 'USD',
      }),
    });

    if (!cartResponse.ok) {
      const errorData = await cartResponse.json().catch(() => ({}));
      console.error('Salable cart creation error:', errorData);
      return new Response(
        JSON.stringify({ error: errorData.title || 'Failed to create cart' }),
        { status: cartResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cartData = await cartResponse.json();
    const cartId = cartData.data.id;

    // Step 3: Add item to cart with groupId (not grantee)
    // Using groupId links the subscription plan to the group containing the grantee
    const itemResponse = await fetch(`${SALABLE_API_URL}/cart-items`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        planId,
        cartId,
        grantee: groupId, // Pass groupId - Salable uses this to link the subscription plan to the group
        interval: 'month',
        intervalCount: 1,
      }),
    });

    if (!itemResponse.ok) {
      const errorData = await itemResponse.json().catch(() => ({}));
      console.error('Salable cart item error:', errorData);
      return new Response(
        JSON.stringify({ error: errorData.title || 'Failed to add item to cart' }),
        { status: itemResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Generate checkout link
    const checkoutResponse = await fetch(`${SALABLE_API_URL}/carts/${cartId}/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        successUrl,
        cancelUrl,
      }),
    });

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json().catch(() => ({}));
      console.error('Salable checkout error:', errorData);
      return new Response(
        JSON.stringify({ error: errorData.title || 'Failed to create checkout link' }),
        { status: checkoutResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const checkoutData = await checkoutResponse.json();
    
    return new Response(
      JSON.stringify({ checkoutUrl: checkoutData.data.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Checkout failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
