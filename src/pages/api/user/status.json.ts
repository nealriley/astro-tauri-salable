import type { APIRoute } from 'astro';

export const prerender = false;

const SALABLE_API_URL = 'https://beta.salable.app/api';

export const GET: APIRoute = async ({ url }) => {
  const granteeId = url.searchParams.get('granteeId');

  if (!granteeId) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameter: granteeId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

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
    // Check if the grantee exists
    const granteeResponse = await fetch(
      `${SALABLE_API_URL}/grantees?granteeId=${encodeURIComponent(granteeId)}`,
      { headers }
    );

    if (!granteeResponse.ok) {
      return new Response(
        JSON.stringify({
          hasSubscription: false,
          granteeId,
          reason: 'grantee_not_found',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const granteeData = await granteeResponse.json();
    
    // Check if grantee exists in the response
    const grantee = granteeData.data?.find((g: { granteeId: string }) => g.granteeId === granteeId);
    
    if (!grantee) {
      return new Response(
        JSON.stringify({
          hasSubscription: false,
          granteeId,
          reason: 'grantee_not_found',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check entitlements to see if user has an active subscription
    const entitlementsResponse = await fetch(
      `${SALABLE_API_URL}/entitlements/check?granteeId=${encodeURIComponent(granteeId)}`,
      { headers }
    );

    if (!entitlementsResponse.ok) {
      return new Response(
        JSON.stringify({
          hasSubscription: false,
          granteeId,
          reason: 'entitlements_check_failed',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const entitlementsData = await entitlementsResponse.json();
    const entitlements = entitlementsData.data?.entitlements || [];

    return new Response(
      JSON.stringify({
        hasSubscription: entitlements.length > 0,
        granteeId,
        entitlementCount: entitlements.length,
        reason: entitlements.length > 0 ? 'active_subscription' : 'no_entitlements',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('User status check error:', error);
    return new Response(
      JSON.stringify({
        hasSubscription: false,
        granteeId,
        reason: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
