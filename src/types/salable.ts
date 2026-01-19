// Salable Beta API Types based on OpenAPI spec

export interface Entitlement {
  type: 'entitlement' | 'meter';
  value: string;
  expiryDate: string | null;
}

export interface EntitlementCheckResponse {
  type: 'object';
  data: {
    entitlements: Entitlement[];
    signature: string;
  };
}

export interface Grantee {
  id: string;
  organisation: string;
  name: string | null;
  granteeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  organisation: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  organisation: string;
  name: string;
  isActive: boolean;
  productId: string;
  tierTagId: string | null;
  trialPeriodDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  organisation: string;
  stripeSubscriptionId: string;
  status: string;
  customerId: string | null;
  interval: 'day' | 'week' | 'month' | 'year' | null;
  intervalCount: number | null;
  currencyShortCode: string | null;
  startDate: string;
  cancelledAt: string | null;
  cancelAtPeriodEnd: boolean;
  isPerpetual: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalableError {
  title: string;
  detail: string | null;
  errors: object[] | null;
}

// License status derived from entitlements
export type LicenseStatus = 'active' | 'expired' | 'none' | 'loading' | 'error';

export interface LicenseInfo {
  status: LicenseStatus;
  entitlements: Entitlement[];
  granteeId: string;
  error?: string;
}
