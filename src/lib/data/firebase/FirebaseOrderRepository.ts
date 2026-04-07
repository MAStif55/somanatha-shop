import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    DocumentData
} from 'firebase/firestore';
import { Order } from '@/types/order';
import { IOrderRepository } from '../interfaces';

const ordersCol = collection(db, 'orders');

export class FirebaseOrderRepository implements IOrderRepository {
    
    async getAll(): Promise<Order[]> {
        const q = query(ordersCol, orderBy('createdAt', 'desc'));
        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        } catch {
            // Fallback
            const snapshot = await getDocs(ordersCol);
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            return orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
    }

    async getById(id: string): Promise<Order | null> {
        const docRef = doc(db, 'orders', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Order;
        }
        return null;
    }

    async create(order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<string> {
        const docRef = await addDoc(ordersCol, {
            ...order,
            status: 'pending',
            createdAt: Date.now()
        });
        return docRef.id;
    }

    async update(id: string, data: Partial<Order>): Promise<void> {
        const docRef = doc(db, 'orders', id);
        await updateDoc(docRef, data as DocumentData);
    }

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'orders', id));
    }
}
