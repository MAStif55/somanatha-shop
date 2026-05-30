import { Db } from 'mongodb';
import { getDb } from './mongo-client';

export interface PushSubscriptionDoc {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    platform: 'ios' | 'android' | 'desktop';
    preferences: {
        tithi: boolean;
        nakshatra: boolean;
        muhurta: boolean;
        promotions: boolean;
        frequency: 'instant' | 'daily';
        quietHours: boolean;
    };
    timezone: string;
    location: {
        lat: number;
        lon: number;
        cityName: string;
    };
    birthDate?: string; // YYYY-MM-DD
    birthTime?: string; // HH:MM, optional
    birthTithi?: number; // 0-29
    lastSentLunarBirthdayDate?: string; // YYYY-MM-DD to avoid sending multiple times
    lastSentTithi?: string;
    lastSentNakshatra?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PushCampaignDoc {
    title: string;
    body: string;
    sentAt: Date;
    sentCount: number;
    successCount: number;
    failedCount: number;
    targetFilter: string;
}

export class MongoPushRepository {
    private isIndexCreated = false;

    private async getCollection(name: 'push_subscriptions' | 'push_campaigns') {
        const db = await getDb();
        if (name === 'push_subscriptions' && !this.isIndexCreated) {
            try {
                await db.collection('push_subscriptions').createIndex({ endpoint: 1 }, { unique: true });
                this.isIndexCreated = true;
            } catch (err) {
                console.error('[MongoDB] Error creating unique index for push_subscriptions:', err);
            }
        }
        return db.collection(name);
    }

    async saveSubscription(data: Omit<PushSubscriptionDoc, 'createdAt' | 'updatedAt'>): Promise<void> {
        try {
            const col = await this.getCollection('push_subscriptions');
            const now = new Date();
            await col.updateOne(
                { endpoint: data.endpoint },
                {
                    $set: {
                        keys: data.keys,
                        platform: data.platform,
                        preferences: data.preferences,
                        timezone: data.timezone,
                        location: data.location,
                        birthDate: data.birthDate,
                        birthTime: data.birthTime,
                        birthTithi: data.birthTithi,
                        lastSentLunarBirthdayDate: data.lastSentLunarBirthdayDate,
                        lastSentTithi: data.lastSentTithi,
                        lastSentNakshatra: data.lastSentNakshatra,
                        updatedAt: now
                    },
                    $setOnInsert: {
                        createdAt: now
                    }
                },
                { upsert: true }
            );
        } catch (error) {
            console.error('[MongoPushRepository] Error saving subscription:', error);
            throw error;
        }
    }

    async getSubscription(endpoint: string): Promise<PushSubscriptionDoc | null> {
        try {
            const col = await this.getCollection('push_subscriptions');
            const doc = await col.findOne({ endpoint });
            return doc as unknown as PushSubscriptionDoc | null;
        } catch (error) {
            console.error('[MongoPushRepository] Error getting subscription:', error);
            return null;
        }
    }

    async deleteSubscription(endpoint: string): Promise<void> {
        try {
            const col = await this.getCollection('push_subscriptions');
            await col.deleteOne({ endpoint });
        } catch (error) {
            console.error('[MongoPushRepository] Error deleting subscription:', error);
        }
    }

    async deleteSubscriptions(endpoints: string[]): Promise<void> {
        if (!endpoints || endpoints.length === 0) return;
        try {
            const col = await this.getCollection('push_subscriptions');
            await col.deleteMany({ endpoint: { $in: endpoints } });
        } catch (error) {
            console.error('[MongoPushRepository] Error bulk deleting subscriptions:', error);
        }
    }

    async getSubscriptions(filter: any = {}): Promise<PushSubscriptionDoc[]> {
        try {
            const col = await this.getCollection('push_subscriptions');
            const docs = await col.find(filter).toArray();
            return docs as unknown as PushSubscriptionDoc[];
        } catch (error) {
            console.error('[MongoPushRepository] Error getting subscriptions:', error);
            return [];
        }
    }

    async updateSentCache(endpoint: string, cache: { lastSentTithi?: string, lastSentNakshatra?: string }): Promise<void> {
        try {
            const col = await this.getCollection('push_subscriptions');
            await col.updateOne({ endpoint }, { $set: cache });
        } catch (error) {
            console.error('[MongoPushRepository] Error updating sent cache:', error);
        }
    }

    async getStats(): Promise<{
        total: number;
        platforms: { ios: number; android: number; desktop: number };
        preferences: { tithi: number; nakshatra: number; muhurta: number; promotions: number };
        frequency: { instant: number; daily: number };
    }> {
        try {
            const col = await this.getCollection('push_subscriptions');
            const total = await col.countDocuments();

            const platforms = { ios: 0, android: 0, desktop: 0 };
            const preferences = { tithi: 0, nakshatra: 0, muhurta: 0, promotions: 0 };
            const frequency = { instant: 0, daily: 0 };

            if (total > 0) {
                // Aggregate platforms
                const platformDocs = await col.aggregate([
                    { $group: { _id: '$platform', count: { $sum: 1 } } }
                ]).toArray();
                platformDocs.forEach(d => {
                    if (d._id === 'ios') platforms.ios = d.count;
                    else if (d._id === 'android') platforms.android = d.count;
                    else if (d._id === 'desktop') platforms.desktop = d.count;
                });

                // Aggregate preferences and frequency
                const prefDocs = await col.aggregate([
                    {
                        $group: {
                            _id: null,
                            tithi: { $sum: { $cond: ['$preferences.tithi', 1, 0] } },
                            nakshatra: { $sum: { $cond: ['$preferences.nakshatra', 1, 0] } },
                            muhurta: { $sum: { $cond: ['$preferences.muhurta', 1, 0] } },
                            promotions: { $sum: { $cond: ['$preferences.promotions', 1, 0] } },
                            instant: { $sum: { $cond: [{ $eq: ['$preferences.frequency', 'instant'] }, 1, 0] } },
                            daily: { $sum: { $cond: [{ $eq: ['$preferences.frequency', 'daily'] }, 1, 0] } }
                        }
                    }
                ]).toArray();

                if (prefDocs && prefDocs.length > 0) {
                    preferences.tithi = prefDocs[0].tithi || 0;
                    preferences.nakshatra = prefDocs[0].nakshatra || 0;
                    preferences.muhurta = prefDocs[0].muhurta || 0;
                    preferences.promotions = prefDocs[0].promotions || 0;
                    frequency.instant = prefDocs[0].instant || 0;
                    frequency.daily = prefDocs[0].daily || 0;
                }
            }

            return { total, platforms, preferences, frequency };
        } catch (error) {
            console.error('[MongoPushRepository] Error getting push stats:', error);
            return {
                total: 0,
                platforms: { ios: 0, android: 0, desktop: 0 },
                preferences: { tithi: 0, nakshatra: 0, muhurta: 0, promotions: 0 },
                frequency: { instant: 0, daily: 0 }
            };
        }
    }

    async saveCampaign(campaign: Omit<PushCampaignDoc, 'sentAt'>): Promise<void> {
        try {
            const col = await this.getCollection('push_campaigns');
            await col.insertOne({
                ...campaign,
                sentAt: new Date()
            });
        } catch (error) {
            console.error('[MongoPushRepository] Error saving campaign:', error);
        }
    }

    async getRecentCampaigns(limit = 10): Promise<PushCampaignDoc[]> {
        try {
            const col = await this.getCollection('push_campaigns');
            const docs = await col.find().sort({ sentAt: -1 }).limit(limit).toArray();
            return docs as unknown as PushCampaignDoc[];
        } catch (error) {
            console.error('[MongoPushRepository] Error getting recent campaigns:', error);
            return [];
        }
    }
}
