import { getDb } from './mongo-client';
import { toIdFilter, docToEntity } from './mongo-helpers';
import { Order } from '@/types/order';
import { IOrderRepository } from '../interfaces';

export class MongoOrderRepository implements IOrderRepository {

    async getAll(): Promise<Order[]> {
        const db = await getDb();
        const docs = await db.collection('orders')
            .find()
            .sort({ createdAt: -1 })
            .toArray();
        return docs.map(d => docToEntity<Order>(d));
    }

    async getById(id: string): Promise<Order | null> {
        const db = await getDb();
        const doc = await db.collection('orders').findOne(toIdFilter(id));
        return doc ? docToEntity<Order>(doc) : null;
    }

    async create(order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<string> {
        const db = await getDb();
        const result = await db.collection('orders').insertOne({
            ...order,
            status: 'pending',
            createdAt: Date.now()
        });
        return result.insertedId.toString();
    }

    async update(id: string, data: Partial<Order>): Promise<void> {
        const db = await getDb();
        const { id: _, ...updateData } = data as Record<string, unknown>;
        await db.collection('orders').updateOne(
            toIdFilter(id),
            { $set: updateData }
        );
    }

    async delete(id: string): Promise<void> {
        const db = await getDb();
        await db.collection('orders').deleteOne(toIdFilter(id));
    }
}
