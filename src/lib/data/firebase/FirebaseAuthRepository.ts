import { auth } from '@/lib/firebase';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { IAuthRepository } from '../interfaces';

export class FirebaseAuthRepository implements IAuthRepository {
    
    onAuthStateChanged(callback: (user: { uid: string, email: string | null } | null) => void): () => void {
        return onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                callback({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email
                });
            } else {
                callback(null);
            }
        });
    }

    async signInWithEmail(email: string, pass: string): Promise<void> {
        await signInWithEmailAndPassword(auth, email, pass);
    }

    async signOut(): Promise<void> {
        await signOut(auth);
    }
}
