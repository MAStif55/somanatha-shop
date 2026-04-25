'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from './auth-actions';

async function requireAuth() {
    const session = await getSession();
    if (!session) {
        throw new Error('Unauthorized Access. Active Administrator session required.');
    }
}

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
    await requireAuth();
    return await ProductRepository.getAll();
}

export async function getProductById(id: string) {
    await requireAuth();
    return await ProductRepository.getById(id);
}

export async function createProduct(data: Partial<Product>) {
    await requireAuth();
    const result = await ProductRepository.create(data);
    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/product/[slug]', 'page');
    return result;
}

export async function updateProduct(id: string, data: Partial<Product>) {
    await requireAuth();
    const result = await ProductRepository.update(id, data);
    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/product/[slug]', 'page');
    return result;
}

export async function deleteProduct(id: string) {
    await requireAuth();
    const result = await ProductRepository.delete(id);
    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/product/[slug]', 'page');
    return result;
}

export async function bulkUpdatePrices(ids: string[], price: number) {
    await requireAuth();
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
    await requireAuth();
    return await CategoryRepository.getSubcategories(categorySlug);
}

export async function createSubcategory(data: Omit<SubCategory, 'id'>) {
    await requireAuth();
    return await CategoryRepository.createSubcategory(data);
}

export async function deleteSubcategory(id: string) {
    await requireAuth();
    return await CategoryRepository.deleteSubcategory(id);
}

export async function getVariations(categorySlug: string) {
    await requireAuth();
    return await CategoryRepository.getVariations(categorySlug);
}

export async function saveVariations(categorySlug: string, variations: VariationGroup[]) {
    await requireAuth();
    return await CategoryRepository.saveVariations(categorySlug, variations);
}

export async function getAllVariations() {
    await requireAuth();
    return await CategoryRepository.getAllVariations();
}

// ==========================================
// ORDERS
// ==========================================

export async function getAllOrders() {
    await requireAuth();
    return await OrderRepository.getAll();
}

export async function updateOrder(id: string, data: Partial<Order>) {
    await requireAuth();
    return await OrderRepository.update(id, data);
}

export async function deleteOrder(id: string) {
    await requireAuth();
    return await OrderRepository.delete(id);
}

export async function getOrderById(id: string) {
    await requireAuth();
    return await OrderRepository.getById(id);
}

// ==========================================
// REVIEWS
// ==========================================

export async function getAllReviews() {
    await requireAuth();
    return await ReviewRepository.getAll();
}

export async function createReview(data: Omit<Review, 'id' | 'createdAt'>) {
    await requireAuth();
    return await ReviewRepository.create(data);
}

export async function updateReview(id: string, data: Partial<Review>) {
    await requireAuth();
    return await ReviewRepository.update(id, data);
}

export async function deleteReview(id: string) {
    await requireAuth();
    return await ReviewRepository.delete(id);
}

// ==========================================
// SETTINGS
// ==========================================

export async function getSettings() {
    await requireAuth();
    return await SettingsRepository.getSettings();
}

export async function updateSettings(data: Partial<StoreSettings>) {
    await requireAuth();
    return await SettingsRepository.updateSettings(data);
}

// ==========================================
// STORAGE & FUNCTIONS
// ==========================================

export async function uploadFile(path: string, formData: FormData) {
    await requireAuth();
    const file = formData.get('file') as File;
    if (!file) throw new Error("No file provided");
    return await StorageRepository.uploadFile(path, file);
}

export async function deleteFile(urlOrPath: string) {
    await requireAuth();
    return await StorageRepository.deleteFile(urlOrPath);
}

export async function triggerDeploy() {
    await requireAuth();
    return await FunctionsRepository.triggerDeploy();
}

export async function triggerBackup() {
    await requireAuth();
    return await FunctionsRepository.triggerBackup();
}
