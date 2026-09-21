import { apiClient } from '@/lib/api/client';
import { appConfig } from '@/lib/config';
import { mockOrderDetails, mockOrders, mockPaymentMethods } from '@/lib/api/mock';
import type { ApiEnvelope, Order, OrderDetail, PaymentMethod } from '@/lib/api/types';

export type CancelOrderPayload = {
  trade_no: string;
};

export type CheckoutOrderPayload = {
  trade_no: string;
  method: number;
};

export type CheckoutResult = { type: 'completed' } | { type: 'redirect'; url: string }

export type CreateOrderPayload = {
  period: string;
  plan_id: number;
  coupon_code?: string;
}

function normalizeCheckoutResult(payload: unknown): CheckoutResult {
  if (!payload || typeof payload !== 'object') throw new Error('支付响应格式异常，请稍后重试')
  const result = payload as { type?: number; data?: unknown }
  if (result.type === -1 && result.data === true) return { type: 'completed' }
  if (result.type === 1 && typeof result.data === 'string' && result.data.trim()) {
    const url = new URL(result.data)
    if (url.protocol === 'https:' || url.protocol === 'http:') return { type: 'redirect', url: url.href }
  }
  throw new Error('支付渠道未返回有效的支付链接，请联系管理员检查配置')
}

export async function getOrders() {
  if (appConfig.enableMock) return mockOrders;
  const response = await apiClient.get<ApiEnvelope<Order[]>>('/api/v1/user/order/fetch');
  return response.data.data;
}

export async function getOrderDetail(tradeNo: string) {
  if (appConfig.enableMock) {
    const detail = mockOrderDetails[tradeNo];
    if (!detail) throw new Error('Order not found');
    return detail;
  }
  const response = await apiClient.get<ApiEnvelope<OrderDetail>>(`/api/v1/user/order/detail?trade_no=${encodeURIComponent(tradeNo)}`);
  return response.data.data;
}

export async function getPaymentMethods() {
  if (appConfig.enableMock) return mockPaymentMethods;
  const response = await apiClient.get<ApiEnvelope<PaymentMethod[]>>('/api/v1/user/order/getPaymentMethod');
  return response.data.data;
}

export async function cancelOrder(payload: CancelOrderPayload) {
  if (appConfig.enableMock) {
    return { success: true, payload };
  }
  const response = await apiClient.post<ApiEnvelope<unknown>>('/api/v1/user/order/cancel', payload);
  return response.data.data;
}

export async function checkoutOrder(payload: CheckoutOrderPayload) {
  if (appConfig.enableMock) {
    return { type: 'redirect', url: 'https://example.com/mock-checkout' } as const;
  }
  const response = await apiClient.post<unknown>('/api/v1/user/order/checkout', payload);
  return normalizeCheckoutResult(response.data);
}

export async function createOrder(payload: CreateOrderPayload) {
  if (appConfig.enableMock) {
    return mockOrders[0]?.trade_no ?? 'mock-trade-no'
  }
  const response = await apiClient.post<ApiEnvelope<string>>('/api/v1/user/order/save', payload)
  return response.data.data
}
