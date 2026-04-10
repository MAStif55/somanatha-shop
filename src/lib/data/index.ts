// ============================================================================
// Firebase Implementations
// ============================================================================
import { FirebaseProductRepository } from './firebase/FirebaseProductRepository';
import { FirebaseOrderRepository } from './firebase/FirebaseOrderRepository';
import { FirebaseReviewRepository } from './firebase/FirebaseReviewRepository';
import { FirebaseCategoryRepository } from './firebase/FirebaseCategoryRepository';
import { FirebaseSettingsRepository } from './firebase/FirebaseSettingsRepository';
import { FirebaseStorageRepository } from './firebase/FirebaseStorageRepository';
import { FirebaseAuthRepository } from './firebase/FirebaseAuthRepository';
import { FirebaseFunctionsRepository } from './firebase/FirebaseFunctionsRepository';

// ============================================================================
// Yandex (MongoDB + S3) Implementations
// ============================================================================
import { MongoProductRepository } from './yandex/MongoProductRepository';
import { MongoOrderRepository } from './yandex/MongoOrderRepository';
import { MongoReviewRepository } from './yandex/MongoReviewRepository';
import { MongoCategoryRepository } from './yandex/MongoCategoryRepository';
import { MongoSettingsRepository } from './yandex/MongoSettingsRepository';
import { S3StorageRepository } from './yandex/S3StorageRepository';
import { MongoAuthRepository } from './yandex/MongoAuthRepository';
import { YandexFunctionsRepository } from './yandex/YandexFunctionsRepository';

// ============================================================================
// DATA ACCESS LAYER FACTORY
// 
// Switch between providers using the DATA_PROVIDER environment variable.
// 
//   DATA_PROVIDER=firebase  →  Use Firebase (default, current live site)
//   DATA_PROVIDER=yandex    →  Use MongoDB + Yandex Object Storage
//
// Set this in your .env.local file:
//   DATA_PROVIDER=firebase
//
// The Firebase code is NEVER deleted — just flip this switch to go back.
// ============================================================================

const provider = process.env.NEXT_PUBLIC_DATA_PROVIDER || 'firebase';

function createRepositories() {
    if (provider === 'yandex') {
        console.log('[DataLayer] Using Yandex (MongoDB + S3) provider');
        return {
            ProductRepository: new MongoProductRepository(),
            OrderRepository: new MongoOrderRepository(),
            ReviewRepository: new MongoReviewRepository(),
            CategoryRepository: new MongoCategoryRepository(),
            SettingsRepository: new MongoSettingsRepository(),
            StorageRepository: new S3StorageRepository(),
            AuthRepository: new MongoAuthRepository(),
            FunctionsRepository: new YandexFunctionsRepository(),
        };
    }

    // Default: Firebase (keeps the current live site working untouched)
    return {
        ProductRepository: new FirebaseProductRepository(),
        OrderRepository: new FirebaseOrderRepository(),
        ReviewRepository: new FirebaseReviewRepository(),
        CategoryRepository: new FirebaseCategoryRepository(),
        SettingsRepository: new FirebaseSettingsRepository(),
        StorageRepository: new FirebaseStorageRepository(),
        AuthRepository: new FirebaseAuthRepository(),
        FunctionsRepository: new FirebaseFunctionsRepository(),
    };
}

const repos = createRepositories();

export const ProductRepository = repos.ProductRepository;
export const OrderRepository = repos.OrderRepository;
export const ReviewRepository = repos.ReviewRepository;
export const CategoryRepository = repos.CategoryRepository;
export const SettingsRepository = repos.SettingsRepository;
export const StorageRepository = repos.StorageRepository;
export const AuthRepository = repos.AuthRepository;
export const FunctionsRepository = repos.FunctionsRepository;
