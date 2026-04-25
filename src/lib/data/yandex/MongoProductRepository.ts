import { getDb } from './mongo-client';
import { toIdFilter, docToEntity } from './mongo-helpers';
import { Product } from '@/types/product';
import { IProductRepository } from '../interfaces';

export class MongoProductRepository implements IProductRepository {

    private generateSlug(text: string): string {
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
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + Date.now().toString(36).slice(-4);
    }

    async getAll(): Promise<Product[]> {
        const db = await getDb();
        const docs = await db.collection('products')
            .find()
            .sort({ createdAt: -1 })
            .toArray();
        return docs.map(d => docToEntity<Product>(d));
    }

    async getNewest(count: number = 4): Promise<Product[]> {
        const db = await getDb();
        const docs = await db.collection('products')
            .find({ status: { $ne: 'hidden' } })
            .sort({ createdAt: -1 })
            .limit(count)
            .toArray();
        return docs.map(d => docToEntity<Product>(d));
    }

    async getByCategory(categorySlug: string): Promise<Product[]> {
        const db = await getDb();
        const docs = await db.collection('products')
            .find({ category: categorySlug, status: { $ne: 'hidden' } })
            .sort({ createdAt: -1 })
            .toArray();
        return docs.map(d => docToEntity<Product>(d));
    }

    async getBySlug(slug: string): Promise<Product | null> {
        const db = await getDb();
        const docs = await db.collection('products').find({ slug }).sort({ createdAt: -1 }).toArray();
        
        if (docs.length === 0) return null;
        
        // Prefer active products over hidden ones in case of duplicate slugs
        const active = docs.find(d => d.status !== 'hidden');
        if (active) return docToEntity<Product>(active);
        
        // Fallback to the newest one if all are hidden
        return docToEntity<Product>(docs[0]);
    }

    async getById(id: string): Promise<Product | null> {
        const db = await getDb();
        // Support both ObjectId and string IDs (for migrated data)
        const doc = await db.collection('products').findOne(toIdFilter(id));
        return doc ? docToEntity<Product>(doc) : null;
    }

    async create(product: Partial<Product>): Promise<string> {
        const db = await getDb();
        const productWithSlug: any = { ...product };
        if (!productWithSlug.slug || productWithSlug.slug.trim() === '') {
            const ruTitle = productWithSlug.title?.ru || productWithSlug.title?.en || '';
            productWithSlug.slug = this.generateSlug(ruTitle);
        }
        const { id, ...dataWithoutId } = productWithSlug;
        const result = await db.collection('products').insertOne({
            ...dataWithoutId,
            createdAt: Date.now()
        });
        return result.insertedId.toString();
    }

    async update(id: string, data: Partial<Product>): Promise<void> {
        const db = await getDb();
        const { id: _, ...updateData } = data as Record<string, unknown>;
        await db.collection('products').updateOne(
            toIdFilter(id),
            { $set: updateData }
        );
    }

    async delete(id: string): Promise<void> {
        const db = await getDb();
        await db.collection('products').deleteOne(toIdFilter(id));
    }

    async bulkUpdatePrices(ids: string[], price: number): Promise<void> {
        if (ids.length === 0) return;
        const db = await getDb();
        const operations = ids.map(id => ({
            updateOne: {
                filter: toIdFilter(id),
                update: { $set: { basePrice: price } },
            },
        }));
        await db.collection('products').bulkWrite(operations);
    }
}
