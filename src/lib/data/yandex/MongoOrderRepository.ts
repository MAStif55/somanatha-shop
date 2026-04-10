import { ObjectId } from 'mongodb';
import { getDb } from './mongo-client';
import { Order } from '@/types/order';
import { IOrderRepository } from '../interfaces';

export class MongoOrderRepository implements IOrderRepository {

    private toOrder(doc: any): Order {
        const { _id, ...rest } = doc;
        return { id: _id.toString(), ...rest } as Order;
    }

    async getAll(): Promise<Order[]> {
        const db = await getDb();
        const docs = await db.collection('orders')
            .find()
            .sort({ createdAt: -1 })
            .toArray();
        return docs.map(d => this.toOrder(d));
    }

    async getById(id: string): Promise<Order | null> {
        const db = await getDb();
        const doc = await db.collection('orders').findOne(
            ObjectId.isValid(id) && id.length === 24
                ? { _id: new ObjectId(id) }
                : { _id: id as any }
        );
        return doc ? this.toOrder(doc) : null;
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
        const { id: _, ...updateData } = data as any;
        await db.collection('orders').updateOne(
            ObjectId.isValid(id) && id.length === 24
                ? { _id: new ObjectId(id) }
                : { _id: id as any },
            { $set: updateData }
        );
    }

    async delete(id: string): Promise<void> {
        const db = await getDb();
        await db.collection('orders').deleteOne(
            ObjectId.isValid(id) && id.length === 24
                ? { _id: new ObjectId(id) }
                : { _id: id as any }
        );
    }
}
