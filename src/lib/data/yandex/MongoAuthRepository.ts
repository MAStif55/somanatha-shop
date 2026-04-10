import { getDb } from './mongo-client';
import { IAuthRepository } from '../interfaces';
import crypto from 'crypto';

// ============================================================================
// SELF-HOSTED AUTH (MongoDB-backed, no Firebase dependency)
//
// Uses a simple admin_users collection with hashed passwords.
// For a small admin-only shop, this is sufficient and fully sovereign.
// ============================================================================

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// In-memory session tracker (per server instance)
let currentUser: { uid: string; email: string | null } | null = null;
const listeners: Set<(user: { uid: string; email: string | null } | null) => void> = new Set();

function notifyListeners() {
    Array.from(listeners).forEach(cb => cb(currentUser));
}

export class MongoAuthRepository implements IAuthRepository {

    onAuthStateChanged(callback: (user: { uid: string; email: string | null } | null) => void): () => void {
        listeners.add(callback);
        // Immediately call back with current state
        callback(currentUser);
        // Return unsubscribe function
        return () => {
            listeners.delete(callback);
        };
    }

    async signInWithEmail(email: string, pass: string): Promise<void> {
        const db = await getDb();
        const hashedPass = hashPassword(pass);
        const user = await db.collection('admin_users').findOne({
            email: email,
            passwordHash: hashedPass
        });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        currentUser = {
            uid: user._id.toString(),
            email: user.email
        };
        notifyListeners();
    }

    async signOut(): Promise<void> {
        currentUser = null;
        notifyListeners();
    }
}
