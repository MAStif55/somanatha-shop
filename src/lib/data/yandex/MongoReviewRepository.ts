import { getDb } from './mongo-client';
import { toIdFilter, docToEntity } from './mongo-helpers';
import { Review } from '@/types/review';
import { IReviewRepository } from '../interfaces';

export class MongoReviewRepository implements IReviewRepository {

    async getAll(): Promise<Review[]> {
        const db = await getDb();
        const docs = await db.collection('reviews')
            .find()
            .sort({ createdAt: -1 })
            .toArray();
        return docs.map(d => docToEntity<Review>(d));
    }

    async getLatest(count: number): Promise<Review[]> {
        const db = await getDb();
        const docs = await db.collection('reviews')
            .find()
            .sort({ createdAt: -1 })
            .limit(count)
            .toArray();
        return docs.map(d => docToEntity<Review>(d));
    }

    async create(review: Omit<Review, 'id' | 'createdAt'>): Promise<string> {
        const db = await getDb();
        const result = await db.collection('reviews').insertOne({
            ...review,
            createdAt: Date.now(),
        });
        return result.insertedId.toString();
    }

    async update(id: string, data: Partial<Review>): Promise<void> {
        const db = await getDb();
        const { id: _, ...updateData } = data as Record<string, unknown>;
        await db.collection('reviews').updateOne(
            toIdFilter(id),
            { $set: updateData }
        );
    }

    async delete(id: string): Promise<void> {
        const db = await getDb();
        await db.collection('reviews').deleteOne(toIdFilter(id));
    }
}
