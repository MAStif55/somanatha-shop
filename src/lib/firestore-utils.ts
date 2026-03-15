import { db } from './firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    Timestamp,
    DocumentData,
    QueryConstraint
} from 'firebase/firestore';

/**
 * Generic Firestore CRUD Utilities
 * 
 * This module provides reusable functions for common Firestore operations.
 * Customize the collection names and types for your specific project.
 */

// ============================================================================
// COLLECTION REFERENCES - Customize these for your project
// ============================================================================

export const productsCol = collection(db, 'products');
export const ordersCol = collection(db, 'orders');
export const optionsCol = collection(db, 'options');
export const subcategoriesCol = collection(db, 'subcategories');

// ============================================================================
// GENERIC CRUD OPERATIONS
// ============================================================================

/**
 * Get all documents from a collection
 */
export async function getAllDocuments<T>(
    collectionRef: ReturnType<typeof collection>,
    ...constraints: QueryConstraint[]
): Promise<T[]> {
    const q = constraints.length > 0
        ? query(collectionRef, ...constraints)
        : collectionRef;

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

/**
 * Get a single document by ID
 */
export async function getDocumentById<T>(
    collectionName: string,
    id: string
): Promise<T | null> {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
}

/**
 * Create a new document (auto-generated ID)
 */
export async function createDocument<T extends DocumentData>(
    collectionRef: ReturnType<typeof collection>,
    data: T
): Promise<string> {
    const dataWithTimestamp = {
        ...data,
        createdAt: Date.now()
    };
    const docRef = await addDoc(collectionRef, dataWithTimestamp);
    return docRef.id;
}

/**
 * Create or update a document with a specific ID
 */
export async function setDocument<T extends DocumentData>(
    collectionName: string,
    id: string,
    data: T
): Promise<void> {
    await setDoc(doc(db, collectionName, id), data);
}

/**
 * Update specific fields in a document
 */
export async function updateDocument<T extends DocumentData>(
    collectionName: string,
    id: string,
    data: Partial<T>
): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data as DocumentData);
}

/**
 * Delete a document
 */
export async function deleteDocument(
    collectionName: string,
    id: string
): Promise<void> {
    await deleteDoc(doc(db, collectionName, id));
}

// ============================================================================
// PRODUCT-SPECIFIC HELPERS (Customize for your product type)
// ============================================================================

/**
 * Get all products, sorted by creation date (newest first)
 */
export async function getAllProducts<T>(): Promise<T[]> {
    const q = query(productsCol, orderBy('createdAt', 'desc'));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch {
        // Fallback if index doesn't exist
        const snapshot = await getDocs(productsCol);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        return products.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    }
}

export async function getNewestProducts<T>(count: number = 4): Promise<T[]> {
    const q = query(productsCol, orderBy('createdAt', 'desc'), firestoreLimit(count));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch {
        // Fallback if composite index doesn't exist yet
        const products = await getAllProducts<T>();
        return products.slice(0, count);
    }
}

/**
 * Get products by category
 */
export async function getProductsByCategory<T>(categorySlug: string): Promise<T[]> {
    const q = query(
        productsCol,
        where('category', '==', categorySlug),
        orderBy('createdAt', 'desc')
    );

    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch {
        // Silently fall back to manual filtering if index doesn't exist
        const all = await getAllProducts<T>();
        // @ts-ignore
        return all.filter(p => p.category === categorySlug);
    }
}

/**
 * Get a product by Slug
 */
export async function getProductBySlug<T>(slug: string): Promise<T | null> {
    const q = query(productsCol, where('slug', '==', slug), firestoreLimit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as T;
    }
    return null;
}

/**
 * Get a product by ID
 */
export async function getProductById<T>(id: string): Promise<T | null> {
    return getDocumentById<T>('products', id);
}

/**
 * Create a new product
 */
export async function createProduct<T extends DocumentData>(product: T): Promise<string> {
    // Auto-generate slug from Russian title if not provided
    const productWithSlug: any = { ...product };
    if (!productWithSlug.slug || productWithSlug.slug.trim() === '') {
        const ruTitle = productWithSlug.title?.ru || productWithSlug.title?.en || '';
        productWithSlug.slug = generateSlug(ruTitle);
    }
    return createDocument(productsCol, productWithSlug);
}

/**
 * Generate a URL-friendly slug from a string (supports Cyrillic)
 */
function generateSlug(text: string): string {
    // Cyrillic to Latin transliteration map
    const cyrillicToLatin: { [key: string]: string } = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };

    return text
        .toLowerCase()
        .split('')
        .map(char => cyrillicToLatin[char] || char)
        .join('')
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, '') // Trim hyphens from ends
        + '-' + Date.now().toString(36).slice(-4); // Add unique suffix
}

/**
 * Update a product
 */
export async function updateProduct<T extends DocumentData>(
    id: string,
    data: Partial<T>
): Promise<void> {
    return updateDocument('products', id, data);
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<void> {
    return deleteDocument('products', id);
}

/**
 * Bulk update product base prices
 */
export async function bulkUpdateProductPrices(ids: string[], price: number): Promise<void> {
    const updates = ids.map(id => updateProduct(id, { basePrice: price }));
    await Promise.all(updates);
}

// ============================================================================
// ORDER HELPERS
// ============================================================================

/**
 * Create a new order
 */
export async function createOrder<T extends DocumentData>(
    order: Omit<T, 'id' | 'createdAt' | 'status'>
): Promise<string> {
    const docRef = await addDoc(ordersCol, {
        ...order,
        status: 'pending',
        createdAt: Date.now()
    });
    return docRef.id;
}

/**
 * Get all orders, sorted by creation date (newest first)
 */
export async function getAllOrders<T>(): Promise<T[]> {
    const q = query(ordersCol, orderBy('createdAt', 'desc'));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch {
        // Fallback
        const snapshot = await getDocs(ordersCol);
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        return orders.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    }
}

/**
 * Update order status or other fields
 */
export async function updateOrder<T extends DocumentData>(
    id: string,
    data: Partial<T>
): Promise<void> {
    const docRef = doc(db, 'orders', id);
    await updateDoc(docRef, data as DocumentData);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Wrap a promise with a timeout
 */
export const withTimeout = <T>(
    promise: Promise<T>,
    ms: number,
    opName: string
): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Operation '${opName}' timed out after ${ms}ms`)), ms)
        )
    ]);
};

// ============================================================================
// SUBCATEGORY HELPERS
// ============================================================================

export async function getSubcategories<T>(categorySlug: string): Promise<T[]> {
    const q = query(subcategoriesCol, where('parentCategory', '==', categorySlug));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

export async function createSubcategory<T extends DocumentData>(data: T): Promise<string> {
    return createDocument(subcategoriesCol, data);
}

export async function deleteSubcategory(id: string): Promise<void> {
    return deleteDocument('subcategories', id);
}
