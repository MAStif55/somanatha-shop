import { Product, VariationGroup } from '@/types/product';
import { Order } from '@/types/order';
import { Review } from '@/types/review';
import { StoreSettings } from '@/types/settings';
import { SubCategory } from '@/types/category';

// ============================================================================
// DATA ACCESS LAYER INTERFACES
// ============================================================================

export interface IProductRepository {
    getAll(): Promise<Product[]>;
    getNewest(count: number): Promise<Product[]>;
    getByCategory(categorySlug: string): Promise<Product[]>;
    getBySlug(slug: string): Promise<Product | null>;
    getById(id: string): Promise<Product | null>;
    create(data: Partial<Product>): Promise<string>;
    update(id: string, data: Partial<Product>): Promise<void>;
    delete(id: string): Promise<void>;
    bulkUpdatePrices(ids: string[], price: number): Promise<void>;
}

export interface IOrderRepository {
    getAll(): Promise<Order[]>;
    getById(id: string): Promise<Order | null>;
    create(data: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<string>;
    update(id: string, data: Partial<Order>): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface IReviewRepository {
    getAll(): Promise<Review[]>;
    getLatest(count: number): Promise<Review[]>;
    create(data: Omit<Review, 'id' | 'createdAt'>): Promise<string>;
    update(id: string, data: Partial<Review>): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface ICategoryRepository {
    // Variations
    getVariations(categorySlug: string): Promise<VariationGroup[]>;
    saveVariations(categorySlug: string, variations: VariationGroup[]): Promise<void>;
    getAllVariations(): Promise<Record<string, VariationGroup[]>>;
    
    // Subcategories
    getSubcategories(categorySlug: string): Promise<SubCategory[]>;
    createSubcategory(data: Omit<SubCategory, 'id'>): Promise<string>;
    deleteSubcategory(id: string): Promise<void>;
}

export interface ISettingsRepository {
    getSettings(): Promise<StoreSettings>;
    updateSettings(data: Partial<StoreSettings>): Promise<void>;
}

export interface IStorageRepository {
    uploadFile(path: string, file: File | Blob): Promise<string>;
    deleteFile(urlOrPath: string): Promise<void>;
}

export interface IAuthRepository {
    // Basic wrapper returning standard JS user object
    onAuthStateChanged(callback: (user: { uid: string, email: string | null } | null) => void): () => void;
    signInWithEmail(email: string, pass: string): Promise<void>;
    signOut(): Promise<void>;
}

export interface IFunctionsRepository {
    triggerDeploy(): Promise<void>;
    triggerBackup(): Promise<{ success: boolean; message?: string }>;
}

export interface InventoryItem {
    offerId: string;
    name: string;
    stock: number;
}

export interface IInventoryRepository {
    getAll(): Promise<InventoryItem[]>;
    getByOfferId(offerId: string): Promise<InventoryItem | null>;
    getByOfferIds(offerIds: string[]): Promise<InventoryItem[]>;
    setStock(offerId: string, name: string, stock: number): Promise<void>;
    deductStock(offerId: string, name: string, quantity: number): Promise<boolean>;
}
