import { activateSubscription, type Subscription } from '../storage/subscriptionStorage';

const BILLING_MODE: 'mock' | 'lemonsqueezy' | 'sbp' =
  (((import.meta as any).env?.VITE_BILLING_MODE as string) || 'mock') as 'mock' | 'lemonsqueezy' | 'sbp';

export interface CreateCheckoutResult {
  url: string | null;
  qrPayload: string | null;
  qrImageUrl: string | null;
  qrcId: string | null;
  expiresAt: string | null;
}

export interface PaymentStatusResult {
  status: 'NotStarted' | 'Waiting' | 'Accepted' | 'Executed' | 'Rejected';
  expiresAt?: string | null;
}

export async function startCheckout(
  userId: string,
  email: string
): Promise<CreateCheckoutResult> {
  console.log('[SBP Billing] startCheckout, mode:', BILLING_MODE, 'userId:', userId);

  if (BILLING_MODE === 'mock') {
    console.log('[SBP Billing] MOCK mode - activating subscription immediately');
    activateSubscription(true);
    return {
      url: null,
      qrPayload: null,
      qrImageUrl: null,
      qrcId: null,
      expiresAt: null,
    };
  }

  try {
    const response = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[SBP Billing] Checkout failed:', response.status, data);
      throw new Error(data.details || data.error || 'Не удалось создать платеж');
    }

    console.log('[SBP Billing] Checkout created:', data);

    return {
      url: null,
      qrPayload: data.qrPayload || null,
      qrImageUrl: data.qrImageUrl || null,
      qrcId: data.qrcId || null,
      expiresAt: data.expiresAt || null,
    };
  } catch (error) {
    console.error('[SBP Billing] Error creating checkout:', error);
    throw error;
  }
}

export async function pollPaymentStatus(qrcId: string): Promise<PaymentStatusResult> {
  if (BILLING_MODE === 'mock') {
    return { status: 'Executed' };
  }

  try {
    const response = await fetch(`/api/billing/payment-status?qrcId=${encodeURIComponent(qrcId)}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[SBP Billing] Status poll failed:', response.status, data);
      throw new Error(data.details || data.error || 'Не удалось проверить статус платежа');
    }

    return {
      status: data.status,
      expiresAt: data.expiresAt || null,
    };
  } catch (error) {
    console.error('[SBP Billing] Error polling status:', error);
    throw error;
  }
}

export async function verifySubscription(email: string): Promise<{ hasSubscription: boolean; expiresAt: string | null; source?: Subscription["source"] }>  {
  if (BILLING_MODE === 'mock') {
    const { getActiveSubscription } = await import('../storage/subscriptionStorage');
    const sub = getActiveSubscription();
    return {
      source:sub.source,
      hasSubscription: sub.isActive,
      expiresAt: sub.expiresAt,
    };
  }

  try {
    const response = await fetch('/api/billing/verify-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      console.error('[SBP Billing] Verify failed:', response.status);
      throw new Error('Failed to verify subscription');
    }

    const data = await response.json();
    return {
      source:["payment","promo","admin","legacy"].includes(data.premiumSource || data.source) ? (data.premiumSource || data.source) : undefined,
      hasSubscription: data.hasSubscription,
      expiresAt: data.expiresAt || null,
    };
  } catch (error) {
    console.error('[SBP Billing] Error verifying subscription:', error);
    throw error;
  }
}


export interface PromoRedeemResult {
  hasSubscription: boolean;
  expiresAt: string;
  activatedAt?: string;
  code: string;
}

export async function redeemPromoCode(
  email: string,
  userId: string | null,
  code: string
): Promise<PromoRedeemResult> {
  const response = await fetch('/api/billing/redeem-promo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, userId, code }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || 'Не удалось применить промокод');
  }

  return data;
}
