import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    DocumentData
} from 'firebase/firestore';
import { Product } from '@/types/product';
import { IProductRepository } from '../interfaces';

const productsCol = collection(db, 'products');

export class FirebaseProductRepository implements IProductRepository {
    
    async getAll(): Promise<Product[]> {
        const q = query(productsCol, orderBy('createdAt', 'desc'));
        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        } catch {
            // Fallback if index doesn't exist
            const snapshot = await getDocs(productsCol);
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            return products.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
    }

    async getNewest(count: number = 4): Promise<Product[]> {
        const q = query(productsCol, orderBy('createdAt', 'desc'), firestoreLimit(count));
        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        } catch {
            // Fallback if composite index doesn't exist yet
            const products = await this.getAll();
            return products.slice(0, count);
        }
    }

    async getByCategory(categorySlug: string): Promise<Product[]> {
        const q = query(
            productsCol,
            where('category', '==', categorySlug),
            orderBy('createdAt', 'desc')
        );

        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        } catch {
            // Silently fall back to manual filtering if index doesn't exist
            const all = await this.getAll();
            return all.filter(p => p.category === categorySlug);
        }
    }

    async getBySlug(slug: string): Promise<Product | null> {
        const q = query(productsCol, where('slug', '==', slug), firestoreLimit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Product;
        }
        return null;
    }

    async getById(id: string): Promise<Product | null> {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Product;
        }
        return null;
    }

    async create(product: Partial<Product>): Promise<string> {
        // Auto-generate slug from Russian title if not provided
        const productWithSlug: any = { ...product };
        if (!productWithSlug.slug || productWithSlug.slug.trim() === '') {
            const ruTitle = productWithSlug.title?.ru || productWithSlug.title?.en || '';
            productWithSlug.slug = this.generateSlug(ruTitle);
        }
        
        const dataWithTimestamp = {
            ...productWithSlug,
            createdAt: Date.now()
        };
        const docRef = await addDoc(productsCol, dataWithTimestamp);
        return docRef.id;
    }

    async update(id: string, data: Partial<Product>): Promise<void> {
        const docRef = doc(db, 'products', id);
        await updateDoc(docRef, data as DocumentData);
    }

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'products', id));
    }

    async bulkUpdatePrices(ids: string[], price: number): Promise<void> {
        const updates = ids.map(id => this.update(id, { basePrice: price }));
        await Promise.all(updates);
    }

    /**
     * Generate a URL-friendly slug from a string (supports Cyrillic)
     */
    private generateSlug(text: string): string {
        // Cyrillic to Latin transliteration map
        const cyrillicToLatin: { [key: string]: string } = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };

        return text
            .toLowerCase()
            .split('')
            .map(char => cyrillicToLatin[char] || char)
            .join('')
            .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, '') // Trim hyphens from ends
            + '-' + Date.now().toString(36).slice(-4); // Add unique suffix
    }
}
