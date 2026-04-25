import { ObjectId } from 'mongodb';
import { getDb } from './mongo-client';
import { toIdFilter, docToEntity } from './mongo-helpers';
import { VariationGroup } from '@/types/product';
import { SubCategory } from '@/types/category';
import { ICategoryRepository } from '../interfaces';
import { CATEGORIES } from '@/types/category';

export class MongoCategoryRepository implements ICategoryRepository {

    // ==========================================
    // VARIATIONS
    // ==========================================

    async getVariations(categorySlug: string): Promise<VariationGroup[]> {
        try {
            const db = await getDb();
            const doc = await db.collection('categoryVariations').findOne(
                { _id: categorySlug as unknown as ObjectId }
            );
            return doc?.variations || [];
        } catch (error) {
            console.error('Error getting category variations:', error);
            return [];
        }
    }

    async saveVariations(categorySlug: string, variations: VariationGroup[]): Promise<void> {
        try {
            const db = await getDb();
            await db.collection('categoryVariations').updateOne(
                { _id: categorySlug as unknown as ObjectId },
                { $set: { categorySlug, variations, updatedAt: Date.now() } },
                { upsert: true }
            );
        } catch (error) {
            console.error('Error saving category variations:', error);
            throw error;
        }
    }

    async getAllVariations(): Promise<Record<string, VariationGroup[]>> {
        // Derive category list from canonical source instead of hardcoding
        const categorySlugs = CATEGORIES.map(c => c.slug);
        const result: Record<string, VariationGroup[]> = {};

        for (const cat of categorySlugs) {
            result[cat] = await this.getVariations(cat);
        }

        return result;
    }

    // ==========================================
    // SUBCATEGORIES
    // ==========================================

    async getSubcategories(categorySlug: string): Promise<SubCategory[]> {
        const db = await getDb();
        const docs = await db.collection('subcategories')
            .find({ parentCategory: categorySlug })
            .toArray();
        return docs.map(d => docToEntity<SubCategory>(d));
    }

    async createSubcategory(data: Omit<SubCategory, 'id'>): Promise<string> {
        const db = await getDb();
        const result = await db.collection('subcategories').insertOne({
            ...data,
            createdAt: Date.now()
        });
        return result.insertedId.toString();
    }

    async deleteSubcategory(id: string): Promise<void> {
        const db = await getDb();
        await db.collection('subcategories').deleteOne(toIdFilter(id));
    }
}
