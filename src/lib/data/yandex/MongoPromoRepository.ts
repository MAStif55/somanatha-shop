import { getMongoDb } from './mongodb';
import { PromoCode } from '../../../types/promo';
import { Collection } from 'mongodb';

export class MongoPromoRepository {
    private getCollection(): Promise<Collection<PromoCode>> {
        return getMongoDb().then(db => db.collection<PromoCode>('promos'));
    }

    async getPromos(): Promise<PromoCode[]> {
        const collection = await this.getCollection();
        const promos = await collection.find({}).sort({ createdAt: -1 }).toArray();
        return promos.map(this.mapMongoDoc);
    }

    async getPromoById(id: string): Promise<PromoCode | null> {
        const collection = await this.getCollection();
        const promo = await collection.findOne({ id });
        if (!promo) return null;
        return this.mapMongoDoc(promo);
    }

    async getPromoByCode(code: string): Promise<PromoCode | null> {
        const collection = await this.getCollection();
        // Case-insensitive search for code
        const promo = await collection.findOne({ code: { $regex: new RegExp(`^${code}$`, 'i') } });
        if (!promo) return null;
        return this.mapMongoDoc(promo);
    }

    async createPromo(promo: PromoCode): Promise<void> {
        const collection = await this.getCollection();
        
        // Ensure code is unique
        const existing = await collection.findOne({ code: { $regex: new RegExp(`^${promo.code}$`, 'i') } });
        if (existing) {
            throw new Error(`Promo code ${promo.code} already exists`);
        }

        await collection.insertOne(promo as any);
    }

    async updatePromo(id: string, updates: Partial<PromoCode>): Promise<void> {
        const collection = await this.getCollection();
        const { _id, ...safeUpdates } = updates as any;
        safeUpdates.updatedAt = Date.now();
        await collection.updateOne({ id }, { $set: safeUpdates });
    }

    async deletePromo(id: string): Promise<void> {
        const collection = await this.getCollection();
        await collection.deleteOne({ id });
    }

    async incrementUsesCount(id: string): Promise<void> {
        const collection = await this.getCollection();
        await collection.updateOne({ id }, { $inc: { usesCount: 1 } });
    }

    private mapMongoDoc(doc: any): PromoCode {
        const { _id, ...rest } = doc;
        return rest as PromoCode;
    }
}
