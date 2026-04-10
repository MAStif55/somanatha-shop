import { getDb } from './mongo-client';
import { VariationGroup } from '@/types/product';
import { SubCategory } from '@/types/category';
import { ICategoryRepository } from '../interfaces';
import { ObjectId } from 'mongodb';

export class MongoCategoryRepository implements ICategoryRepository {

    // ==========================================
    // VARIATIONS
    // ==========================================

    async getVariations(categorySlug: string): Promise<VariationGroup[]> {
        try {
            const db = await getDb();
            const doc = await db.collection('categoryVariations').findOne({ _id: categorySlug as any });
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
                { _id: categorySlug as any },
                { $set: { categorySlug, variations, updatedAt: Date.now() } },
                { upsert: true }
            );
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
        const db = await getDb();
        const docs = await db.collection('subcategories')
            .find({ parentCategory: categorySlug })
            .toArray();
        return docs.map(d => {
            const { _id, ...rest } = d;
            return { id: _id.toString(), ...rest } as SubCategory;
        });
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
        await db.collection('subcategories').deleteOne(
            ObjectId.isValid(id) && id.length === 24
                ? { _id: new ObjectId(id) }
                : { _id: id as any }
        );
    }
}
