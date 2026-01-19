import type { APIRoute } from 'astro';

export const prerender = false;

interface FileNode {
  name: string;
  path: string;
  absolute: string;
  type: 'file' | 'directory';
  ignored: boolean;
}

export const GET: APIRoute = async ({ url }) => {
  const OPENCODE_URL = import.meta.env.OPENCODE_URL || 'http://localhost:4096';
  const path = url.searchParams.get('path') || '.';
  
  try {
    const response = await fetch(`${OPENCODE_URL}/file?path=${encodeURIComponent(path)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          files: [],
          error: `OpenCode returned status ${response.status}`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const files: FileNode[] = await response.json();
    
    // Filter out hidden files (starting with .) and sort: directories first, then files
    const visibleFiles = files
      .filter(f => !f.name.startsWith('.') && !f.ignored)
      .sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
    
    return new Response(
      JSON.stringify({
        files: visibleFiles,
        path,
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
        files: [],
        path,
        error: `Failed to connect to OpenCode: ${errorMessage}`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
