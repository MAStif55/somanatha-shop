'use server';

import { ProductRepository, ReviewRepository, OrderRepository, SettingsRepository } from '@/lib/data';

// ==========================================
// CATALOG (PUBLIC FACING)
// ==========================================

/**
 * Public settings endpoint for storefront (shipping config, contact info).
 * No auth required — these are displayed on the public site.
 */
export async function getPublicSettings() {
    return await SettingsRepository.getSettings();
}

export async function getNewestProducts(count: number = 4) {
    return await ProductRepository.getNewest(count);
}

export async function getProductsByCategory(categorySlug: string) {
    return await ProductRepository.getByCategory(categorySlug);
}

export async function getProductBySlug(slug: string) {
    return await ProductRepository.getBySlug(slug);
}

export async function getLatestReviews(count: number = 10) {
    return await ReviewRepository.getLatest(count);
}

export async function createOrder(data: Omit<import('@/types/order').Order, 'id' | 'createdAt' | 'status'>) {
    return await OrderRepository.create(data);
}

/**
 * Public-facing order payment status check.
 * Returns only payment status — no PII exposed.
 * Used by the payment-result page to poll for payment confirmation.
 */
export async function getOrderPaymentStatus(orderId: string) {
    const order = await OrderRepository.getById(orderId);
    if (!order) return null;
    return { paymentStatus: order.paymentStatus || 'pending' };
}
