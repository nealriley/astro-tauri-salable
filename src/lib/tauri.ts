// Tauri integration helpers
// These functions handle communication between the web frontend and Tauri backend

declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.__TAURI__;
}

export async function invokeCommand<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriEnvironment()) {
    throw new Error('Not running in Tauri environment');
  }
  return window.__TAURI__!.core.invoke<T>(cmd, args);
}

export async function getUsername(): Promise<string> {
  if (isTauriEnvironment()) {
    try {
      return await invokeCommand<string>('get_username');
    } catch (error) {
      console.error('Failed to get username from Tauri:', error);
      return getFallbackUsername();
    }
  }
  return getFallbackUsername();
}

function getFallbackUsername(): string {
  // In browser environment, use URL param or default
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const username = params.get('username');
    if (username) return username;
  }
  return 'demo-user';
}

export async function getSystemInfo(): Promise<{ platform: string; version: string } | null> {
  if (!isTauriEnvironment()) return null;
  
  try {
    return await invokeCommand<{ platform: string; version: string }>('get_system_info');
  } catch {
    return null;
  }
}
