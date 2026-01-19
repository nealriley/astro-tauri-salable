const USER_STORAGE_KEY = 'cloudvault_user';
const LOGGED_OUT_KEY = 'cloudvault_logged_out';

export function getStoredUser(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_STORAGE_KEY);
}

export function setStoredUser(username: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_STORAGE_KEY, username);
  // Clear logged out flag when user logs in
  localStorage.removeItem(LOGGED_OUT_KEY);
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_STORAGE_KEY);
  // Set logged out flag to prevent auto-login in Tauri
  localStorage.setItem(LOGGED_OUT_KEY, 'true');
}

export function isExplicitlyLoggedOut(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LOGGED_OUT_KEY) === 'true';
}

export function getUserFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('username') || params.get('user');
}

export function initializeUser(): { username: string | null; source: 'url' | 'storage' | 'none' } {
  // Priority: URL param > localStorage > none
  const urlUser = getUserFromUrl();
  if (urlUser) {
    setStoredUser(urlUser);
    return { username: urlUser, source: 'url' };
  }

  const storedUser = getStoredUser();
  if (storedUser) {
    return { username: storedUser, source: 'storage' };
  }

  return { username: null, source: 'none' };
}
