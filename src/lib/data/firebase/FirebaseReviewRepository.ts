import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    getDocs,
    addDoc,
    deleteDoc,
    updateDoc,
    query,
    orderBy,
    limit as firestoreLimit
} from 'firebase/firestore';
import { Review } from '@/types/review';
import { IReviewRepository } from '../interfaces';

const reviewsCol = collection(db, 'reviews');

export class FirebaseReviewRepository implements IReviewRepository {
    
    async getAll(): Promise<Review[]> {
        const q = query(reviewsCol, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    }

    async getLatest(count: number): Promise<Review[]> {
        const q = query(reviewsCol, orderBy('createdAt', 'desc'), firestoreLimit(count));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    }

    async create(data: Omit<Review, 'id' | 'createdAt'>): Promise<string> {
        const docRef = await addDoc(reviewsCol, {
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        return docRef.id;
    }

    async update(id: string, data: Partial<Review>): Promise<void> {
        await updateDoc(doc(db, 'reviews', id), {
            ...data,
            updatedAt: Date.now()
        } as any);
    }

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'reviews', id));
    }
}
