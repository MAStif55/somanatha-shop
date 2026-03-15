import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK — Server-Side Only
 * 
 * Used by Server Components at build time (`output: 'export'`).
 * Authentication methods (in priority order):
 *   1. GOOGLE_APPLICATION_CREDENTIALS env var (CI/CD — service account JSON path)
 *   2. FIREBASE_SERVICE_ACCOUNT_BASE64 env var (CI/CD — base64-encoded JSON)
 *   3. Application Default Credentials (local — via `firebase login` / `gcloud auth`)
 */

let adminApp: App;
let adminDb: Firestore;

function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    // If a base64-encoded service account is provided (useful for CI)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const serviceAccount = JSON.parse(
            Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString()
        );
        return initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
    }

    // Otherwise use ADC (GOOGLE_APPLICATION_CREDENTIALS or `firebase login`)
    return initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'somanatha-shop',
    });
}

function getAdminDb(): Firestore {
    if (!adminApp) {
        adminApp = getAdminApp();
    }
    if (!adminDb) {
        adminDb = getFirestore(adminApp);
    }
    return adminDb;
}

// ============================================================================
// SERVER-SIDE DATA FETCHING FUNCTIONS
// ============================================================================

export interface ServerProduct {
    id: string;
    title: { ru: string; en: string };
    description: { ru: string; en: string };
    shortDescription?: { ru: string; en: string };
    basePrice: number;
    images?: Array<string | { url: string; alt?: { ru?: string; en?: string } }>;
    category?: string;
    slug?: string;
    videoPreviewUrl?: string;
    createdAt?: number;
    [key: string]: unknown;
}

/**
 * Fetch newest products from Firestore at build time.
 */
export async function getNewestProductsServer(count: number = 4): Promise<ServerProduct[]> {
    try {
        const db = getAdminDb();
        const snapshot = await db
            .collection('products')
            .orderBy('createdAt', 'desc')
            .limit(count)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as ServerProduct));
    } catch (error) {
        console.error('[firebase-admin] Error fetching products:', error);
        // Return empty array — the page will render without the section
        return [];
    }
}
