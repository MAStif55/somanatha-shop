import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    getDocs,
    addDoc,
    deleteDoc,
    query,
    where
} from 'firebase/firestore';
import { VariationGroup } from '@/types/product';
import { SubCategory } from '@/types/category';
import { ICategoryRepository } from '../interfaces';

const subcategoriesCol = collection(db, 'subcategories');
const variationsColName = 'categoryVariations';

export class FirebaseCategoryRepository implements ICategoryRepository {
    
    // ==========================================
    // VARIATIONS
    // ==========================================

    async getVariations(categorySlug: string): Promise<VariationGroup[]> {
        try {
            const docRef = doc(db, variationsColName, categorySlug);
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

    async saveVariations(categorySlug: string, variations: VariationGroup[]): Promise<void> {
        try {
            const docRef = doc(db, variationsColName, categorySlug);
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

    async getAllVariations(): Promise<Record<string, VariationGroup[]>> {
        const categories = ['yantras', 'kavacha'];
        const result: Record<string, VariationGroup[]> = {};

        for (const cat of categories) {
            result[cat] = await this.getVariations(cat);
        }

        return result;
    }

    // ==========================================
    // SUBCATEGORIES
    // ==========================================

    async getSubcategories(categorySlug: string): Promise<SubCategory[]> {
        const q = query(subcategoriesCol, where('parentCategory', '==', categorySlug));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubCategory));
    }

    async createSubcategory(data: Omit<SubCategory, 'id'>): Promise<string> {
        const docRef = await addDoc(subcategoriesCol, {
            ...data,
            createdAt: Date.now()
        });
        return docRef.id;
    }

    async deleteSubcategory(id: string): Promise<void> {
        await deleteDoc(doc(db, 'subcategories', id));
    }
}
