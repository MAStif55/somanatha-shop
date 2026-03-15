import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { StoreSettings, defaultSettings } from '@/types/settings';

const SETTINGS_COLLECTION = 'settings';
const GENERAL_DOC_ID = 'general';

export async function getStoreSettings(): Promise<StoreSettings> {
    try {
        const ref = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            // Merge with default settings to ensure new fields are present
            return { ...defaultSettings, ...snap.data() } as StoreSettings;
        } else {
            // Create default settings if they don't exist
            await setDoc(ref, defaultSettings);
            return defaultSettings;
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
        return defaultSettings;
    }
}

export async function updateStoreSettings(settings: Partial<StoreSettings>): Promise<void> {
    try {
        const ref = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
        await setDoc(ref, settings, { merge: true });
    } catch (error) {
        console.error("Error updating settings:", error);
        throw error;
    }
}
