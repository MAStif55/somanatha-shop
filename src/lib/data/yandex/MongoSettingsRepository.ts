import { getDb } from './mongo-client';
import { StoreSettings, defaultSettings } from '@/types/settings';
import { ISettingsRepository } from '../interfaces';

export class MongoSettingsRepository implements ISettingsRepository {

    async getSettings(): Promise<StoreSettings> {
        try {
            const db = await getDb();
            const doc = await db.collection('settings').findOne({ _id: 'store' as any });

            if (doc) {
                const { _id, ...data } = doc;
                return { ...defaultSettings, ...data } as StoreSettings;
            }
            return defaultSettings;
        } catch (error) {
            console.error('Error getting store settings:', error);
            return defaultSettings;
        }
    }

    async updateSettings(data: Partial<StoreSettings>): Promise<void> {
        try {
            const db = await getDb();
            await db.collection('settings').updateOne(
                { _id: 'store' as any },
                { $set: { ...data, updatedAt: Date.now() } },
                { upsert: true }
            );
        } catch (error) {
            console.error('Error updating store settings:', error);
            throw error;
        }
    }
}
