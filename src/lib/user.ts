const USER_STORAGE_KEY = 'cloudvault_user';

export function getStoredUser(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_STORAGE_KEY);
}

export function setStoredUser(username: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_STORAGE_KEY, username);
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_STORAGE_KEY);
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
