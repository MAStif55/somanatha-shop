'use strict';
'use server';
import { revalidatePath } from 'next/cache';

import { 
    ProductRepository, 
    CategoryRepository, 
    OrderRepository, 
    ReviewRepository, 
    SettingsRepository, 
    StorageRepository, 
    FunctionsRepository 
} from '@/lib/data';
import { Product } from '@/types/product';
import { Order } from '@/types/order';
import { Review } from '@/types/review';
import { StoreSettings } from '@/types/settings';
import { SubCategory } from '@/types/category';
import { VariationGroup } from '@/types/product';

// ==========================================
// PRODUCTS
// ==========================================

export async function getAllProducts() {
    return await ProductRepository.getAll();
}

export async function getProductById(id: string) {
    return await ProductRepository.getById(id);
}

export async function createProduct(data: Partial<Product>) {
    const result = await ProductRepository.create(data);
    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/product/[slug]', 'page');
    return result;
}

export async function updateProduct(id: string, data: Partial<Product>) {
    const result = await ProductRepository.update(id, data);
    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/product/[slug]', 'page');
    return result;
}

export async function deleteProduct(id: string) {
    const result = await ProductRepository.delete(id);
    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/product/[slug]', 'page');
    return result;
}

export async function bulkUpdatePrices(ids: string[], price: number) {
    const result = await ProductRepository.bulkUpdatePrices(ids, price);
    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/product/[slug]', 'page');
    return result;
}

// ==========================================
// CATEGORIES & SUBCATEGORIES
// ==========================================

export async function getSubcategories(categorySlug: string) {
    return await CategoryRepository.getSubcategories(categorySlug);
}

export async function createSubcategory(data: Omit<SubCategory, 'id'>) {
    return await CategoryRepository.createSubcategory(data);
}

export async function deleteSubcategory(id: string) {
    return await CategoryRepository.deleteSubcategory(id);
}

export async function getVariations(categorySlug: string) {
    return await CategoryRepository.getVariations(categorySlug);
}

export async function saveVariations(categorySlug: string, variations: VariationGroup[]) {
    return await CategoryRepository.saveVariations(categorySlug, variations);
}

export async function getAllVariations() {
    return await CategoryRepository.getAllVariations();
}

// ==========================================
// ORDERS
// ==========================================

export async function getAllOrders() {
    return await OrderRepository.getAll();
}

export async function updateOrder(id: string, data: Partial<Order>) {
    return await OrderRepository.update(id, data);
}

export async function deleteOrder(id: string) {
    return await OrderRepository.delete(id);
}

export async function getOrderById(id: string) {
    return await OrderRepository.getById(id);
}

// ==========================================
// REVIEWS
// ==========================================

export async function getAllReviews() {
    return await ReviewRepository.getAll();
}

export async function createReview(data: Omit<Review, 'id' | 'createdAt'>) {
    return await ReviewRepository.create(data);
}

export async function updateReview(id: string, data: Partial<Review>) {
    return await ReviewRepository.update(id, data);
}

export async function deleteReview(id: string) {
    return await ReviewRepository.delete(id);
}

// ==========================================
// SETTINGS
// ==========================================

export async function getSettings() {
    return await SettingsRepository.getSettings();
}

export async function updateSettings(data: Partial<StoreSettings>) {
    return await SettingsRepository.updateSettings(data);
}

// ==========================================
// STORAGE & FUNCTIONS
// ==========================================

// FormData is necessary instead of direct File objects for Server Actions
export async function uploadFile(path: string, formData: FormData) {
    const file = formData.get('file') as File;
    if (!file) throw new Error("No file provided");
    return await StorageRepository.uploadFile(path, file);
}

export async function deleteFile(urlOrPath: string) {
    return await StorageRepository.deleteFile(urlOrPath);
}

export async function triggerDeploy() {
    return await FunctionsRepository.triggerDeploy();
}

export async function triggerBackup() {
    return await FunctionsRepository.triggerBackup();
}
