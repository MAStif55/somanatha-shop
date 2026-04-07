import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { IStorageRepository } from '../interfaces';

export class FirebaseStorageRepository implements IStorageRepository {
    
    async uploadFile(path: string, file: File | Blob): Promise<string> {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    }

    async deleteFile(urlOrPath: string): Promise<void> {
        try {
            // Need to create a reference whether it is a URL or a full path
            const storageRef = ref(storage, urlOrPath);
            await deleteObject(storageRef);
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }
}
