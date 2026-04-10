'use strict';
'use server';

import { ProductRepository, CategoryRepository, ReviewRepository, OrderRepository } from '@/lib/data';
import { Order } from '@/types/order';

// ==========================================
// CATALOG (PUBLIC FACING)
// ==========================================

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

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'status'>) {
    return await OrderRepository.create(data);
}
