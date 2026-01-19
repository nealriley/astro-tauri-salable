import type { APIRoute } from 'astro';

export const prerender = false;

interface OpenCodeHealth {
  healthy: boolean;
  version: string;
}

export const GET: APIRoute = async () => {
  const OPENCODE_URL = import.meta.env.OPENCODE_URL || 'http://localhost:4096';
  
  try {
    const response = await fetch(`${OPENCODE_URL}/global/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Short timeout to avoid blocking
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          healthy: false,
          version: null,
          error: `OpenCode returned status ${response.status}`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data: OpenCodeHealth = await response.json();
    
    return new Response(
      JSON.stringify({
        healthy: data.healthy,
        version: data.version,
        error: null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        healthy: false,
        version: null,
        error: `Failed to connect to OpenCode: ${errorMessage}`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
