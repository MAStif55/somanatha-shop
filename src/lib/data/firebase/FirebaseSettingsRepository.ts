import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { StoreSettings, defaultSettings } from '@/types/settings';
import { ISettingsRepository } from '../interfaces';

export class FirebaseSettingsRepository implements ISettingsRepository {
    
    async getSettings(): Promise<StoreSettings> {
        try {
            const docRef = doc(db, 'settings', 'store');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Merge with defaults to ensure all fields exist
                return { ...defaultSettings, ...docSnap.data() } as StoreSettings;
            }
            return defaultSettings;
        } catch (error) {
            console.error('Error getting store settings:', error);
            return defaultSettings;
        }
    }

    async updateSettings(data: Partial<StoreSettings>): Promise<void> {
        try {
            const docRef = doc(db, 'settings', 'store');
            await setDoc(docRef, {
                ...data,
                updatedAt: Date.now()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating store settings:', error);
            throw error;
        }
    }
}
