import { getDb } from './mongo-client';
import { IAuthRepository } from '../interfaces';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// ============================================================================
// SELF-HOSTED AUTH (MongoDB-backed, fully sovereign)
//
// Uses a simple admin_users collection with bcrypt-hashed passwords.
// For a small admin-only shop, this is sufficient and fully sovereign.
//
// Migration: Existing SHA-256 hashes are auto-upgraded to bcrypt on login.
// ============================================================================

const BCRYPT_ROUNDS = 12;

/**
 * Legacy SHA-256 hash for migration compatibility.
 * New logins always use bcrypt.
 */
function sha256Hash(password: string): string {
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
        const user = await db.collection('admin_users').findOne({ email });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        const storedHash: string = user.passwordHash;

        // Check if the stored hash is a bcrypt hash (starts with $2b$ or $2a$)
        if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
            // Modern bcrypt comparison
            const isValid = await bcrypt.compare(pass, storedHash);
            if (!isValid) {
                throw new Error('Invalid email or password');
            }
        } else {
            // Legacy SHA-256 comparison — auto-upgrade to bcrypt on success
            const legacyHash = sha256Hash(pass);
            if (legacyHash !== storedHash) {
                throw new Error('Invalid email or password');
            }

            // Auto-upgrade: replace SHA-256 hash with bcrypt
            const bcryptHash = await bcrypt.hash(pass, BCRYPT_ROUNDS);
            await db.collection('admin_users').updateOne(
                { _id: user._id },
                { $set: { passwordHash: bcryptHash } }
            );
            console.log(`[Auth] Upgraded password hash for ${email} from SHA-256 to bcrypt`);
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
