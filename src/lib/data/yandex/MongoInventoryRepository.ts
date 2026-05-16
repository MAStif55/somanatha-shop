import { getDb } from './mongo-client';
import { IInventoryRepository, InventoryItem } from '../interfaces';

export class MongoInventoryRepository implements IInventoryRepository {
    private async getCollection() {
        const db = await getDb();
        return db.collection<InventoryItem>('inventory');
    }

    async getAll(): Promise<InventoryItem[]> {
        const col = await this.getCollection();
        const items = await col.find({}).toArray();
        return items.map(item => ({
            offerId: item.offerId,
            name: item.name,
            stock: item.stock
        }));
    }

    async getByOfferId(offerId: string): Promise<InventoryItem | null> {
        const col = await this.getCollection();
        const item = await col.findOne({ offerId });
        if (!item) return null;
        return {
            offerId: item.offerId,
            name: item.name,
            stock: item.stock
        };
    }

    async getByOfferIds(offerIds: string[]): Promise<InventoryItem[]> {
        if (!offerIds.length) return [];
        const col = await this.getCollection();
        const items = await col.find({ offerId: { $in: offerIds } }).toArray();
        return items.map(item => ({
            offerId: item.offerId,
            name: item.name,
            stock: item.stock
        }));
    }

    async setStock(offerId: string, name: string, stock: number): Promise<void> {
        const col = await this.getCollection();
        await col.updateOne(
            { offerId },
            { $set: { offerId, name, stock } },
            { upsert: true }
        );
    }

    async deductStock(offerId: string, name: string, quantity: number): Promise<boolean> {
        const col = await this.getCollection();
        // Atomic deduction: only deduct if stock >= quantity
        const result = await col.updateOne(
            { offerId, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } }
        );

        if (result.modifiedCount > 0) {
            return true; // Successfully deducted
        }

        // If not found or stock insufficient, let's check if the document exists
        const exists = await col.findOne({ offerId });
        if (!exists) {
            // Create with 0 or negative stock? Better to just fail and let the user add stock first.
            return false;
        }

        return false;
    }
}
