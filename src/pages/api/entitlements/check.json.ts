import type { APIRoute } from 'astro';
import { SalableClient, createLicenseInfo } from '@/lib/salable';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const granteeId = url.searchParams.get('granteeId');

  if (!granteeId) {
    return new Response(
      JSON.stringify({
        error: 'Missing required parameter: granteeId',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const apiKey = import.meta.env.SALABLE_API_KEY;

  if (!apiKey) {
    // Return mock data if no API key is configured
    console.warn('SALABLE_API_KEY not configured, returning mock data');
    return new Response(
      JSON.stringify({
        status: 'active',
        granteeId,
        entitlements: [
          {
            type: 'entitlement',
            value: 'basic',
            expiryDate: null, // Never expires
          },
          {
            type: 'entitlement',
            value: 'pro',
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          },
        ],
        signature: 'mock-signature',
        _mock: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const client = new SalableClient(apiKey);
    const response = await client.checkEntitlements(granteeId);
    const licenseInfo = createLicenseInfo(granteeId, response);

    return new Response(JSON.stringify(licenseInfo), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Salable API error:', error);

    // Check if it's a 404 (grantee not found) - return empty entitlements
    if (error instanceof Error && error.message.includes('404')) {
      return new Response(
        JSON.stringify({
          status: 'none',
          granteeId,
          entitlements: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to check entitlements',
        status: 'error',
        granteeId,
        entitlements: [],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
