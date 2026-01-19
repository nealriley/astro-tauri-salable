import type { EntitlementCheckResponse, Entitlement, LicenseInfo, LicenseStatus } from '@/types/salable';

const SALABLE_API_BASE = 'https://beta.salable.app';

export class SalableClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${SALABLE_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ title: 'Unknown error' }));
      throw new Error(error.title || `API error: ${response.status}`);
    }

    return response.json();
  }

  async checkEntitlements(granteeId: string): Promise<EntitlementCheckResponse> {
    return this.fetch<EntitlementCheckResponse>(
      `/api/entitlements/check?granteeId=${encodeURIComponent(granteeId)}`
    );
  }

  async getProducts(): Promise<{ type: 'list'; data: any[]; hasMore: boolean }> {
    return this.fetch('/api/products');
  }

  async getPlans(): Promise<{ type: 'list'; data: any[]; hasMore: boolean }> {
    return this.fetch('/api/plans');
  }
}

// Helper to determine license status from entitlements
export function determineLicenseStatus(entitlements: Entitlement[]): LicenseStatus {
  if (entitlements.length === 0) {
    return 'none';
  }

  const now = new Date();
  const hasActiveEntitlement = entitlements.some(e => {
    if (!e.expiryDate) return true; // No expiry = perpetual
    return new Date(e.expiryDate) > now;
  });

  return hasActiveEntitlement ? 'active' : 'expired';
}

// Create license info from API response
export function createLicenseInfo(
  granteeId: string,
  response: EntitlementCheckResponse
): LicenseInfo {
  const entitlements = response.data.entitlements;
  const status = determineLicenseStatus(entitlements);

  return {
    status,
    entitlements,
    granteeId,
  };
}

// Check if user has a specific entitlement
export function hasEntitlement(entitlements: Entitlement[], entitlementName: string): boolean {
  const now = new Date();
  return entitlements.some(e => {
    if (e.value !== entitlementName) return false;
    if (!e.expiryDate) return true;
    return new Date(e.expiryDate) > now;
  });
}

// Format expiry date for display
export function formatExpiryDate(expiryDate: string | null): string {
  if (!expiryDate) return 'Never';
  const date = new Date(expiryDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Get days until expiry
export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
