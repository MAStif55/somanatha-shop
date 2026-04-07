import { FirebaseProductRepository } from './firebase/FirebaseProductRepository';
import { FirebaseOrderRepository } from './firebase/FirebaseOrderRepository';
import { FirebaseReviewRepository } from './firebase/FirebaseReviewRepository';
import { FirebaseCategoryRepository } from './firebase/FirebaseCategoryRepository';
import { FirebaseSettingsRepository } from './firebase/FirebaseSettingsRepository';
import { FirebaseStorageRepository } from './firebase/FirebaseStorageRepository';
import { FirebaseAuthRepository } from './firebase/FirebaseAuthRepository';
import { FirebaseFunctionsRepository } from './firebase/FirebaseFunctionsRepository';

// ============================================================================
// DATA ACCESS LAYER EXPORTS
// 
// Change these implementations to switch the backend provider (e.g., to MongoDB)
// ============================================================================

export const ProductRepository = new FirebaseProductRepository();
export const OrderRepository = new FirebaseOrderRepository();
export const ReviewRepository = new FirebaseReviewRepository();
export const CategoryRepository = new FirebaseCategoryRepository();
export const SettingsRepository = new FirebaseSettingsRepository();
export const StorageRepository = new FirebaseStorageRepository();
export const AuthRepository = new FirebaseAuthRepository();
export const FunctionsRepository = new FirebaseFunctionsRepository();
