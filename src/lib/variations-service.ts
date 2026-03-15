import { db } from './firebase';
import {
    collection,
    doc,
    getDoc,
    setDoc,
} from 'firebase/firestore';
import { VariationGroup } from '@/types/product';

/**
 * Variations Service
 * 
 * Manages category-level default variations stored in Firestore.
 */

const COLLECTION_NAME = 'categoryVariations';

/**
 * Get default variations for a category
 */
export async function getCategoryVariations(categorySlug: string): Promise<VariationGroup[]> {
    try {
        const docRef = doc(db, COLLECTION_NAME, categorySlug);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.variations || [];
        }
        return [];
    } catch (error) {
        console.error('Error getting category variations:', error);
        return [];
    }
}

/**
 * Save default variations for a category
 */
export async function saveCategoryVariations(
    categorySlug: string,
    variations: VariationGroup[]
): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, categorySlug);
        await setDoc(docRef, {
            categorySlug,
            variations,
            updatedAt: Date.now(),
        });
    } catch (error) {
        console.error('Error saving category variations:', error);
        throw error;
    }
}

/**
 * Get all category variations (for admin)
 */
export async function getAllCategoryVariations(): Promise<Record<string, VariationGroup[]>> {
    const categories = ['yantras', 'kavacha'];
    const result: Record<string, VariationGroup[]> = {};

    for (const cat of categories) {
        result[cat] = await getCategoryVariations(cat);
    }

    return result;
}
