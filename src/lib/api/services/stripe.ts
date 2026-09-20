import { apiClient } from '@/lib/api/client';
import { appConfig } from '@/lib/config';
import type { ApiEnvelope } from '@/lib/api/types';

export type StripeSubscription = {
  order: {
    trade_no: string;
    plan_id: number;
    period: string;
    status: number;
  } | null;
  stripe: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    default_payment_method: string | null;
  } | null;
} | null;

export async function getSubscription() {
  if (appConfig.enableMock) {
    return {
      order: { trade_no: 'mock-trade-no', plan_id: 1, period: 'monthly', status: 3 },
      stripe: {
        id: 'sub_mock', status: 'active',
        current_period_start: Math.floor(Date.now() / 1000) - 86400,
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        cancel_at_period_end: false,
        default_payment_method: 'set',
      },
    } as StripeSubscription;
  }
  const response = await apiClient.get<ApiEnvelope<StripeSubscription>>('/api/v1/user/stripe/subscription');
  return response.data.data;
}

export async function createPortalSession() {
  if (appConfig.enableMock) return { url: 'https://billing.stripe.com/p/session/mock' };
  const response = await apiClient.post<ApiEnvelope<{ url: string }>>('/api/v1/user/stripe/portal');
  return response.data.data;
}

export async function cancelSubscription() {
  if (appConfig.enableMock) return true;
  const response = await apiClient.post<ApiEnvelope<unknown>>('/api/v1/user/stripe/cancel');
  return response.data.data;
}

export async function getInvoices() {
  if (appConfig.enableMock) return [];
  const response = await apiClient.get<ApiEnvelope<unknown[]>>('/api/v1/user/invoice/fetch');
  return response.data.data;
}

export async function getRefunds() {
  if (appConfig.enableMock) return [];
  const response = await apiClient.get<ApiEnvelope<unknown[]>>('/api/v1/user/refund/fetch');
  return response.data.data;
}

export async function requestRefund(tradeNo: string, reason: string) {
  if (appConfig.enableMock) return { id: 1 };
  const response = await apiClient.post<ApiEnvelope<unknown>>('/api/v1/user/refund/request', { trade_no: tradeNo, reason });
  return response.data.data;
}
