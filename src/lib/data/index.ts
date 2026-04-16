import { MongoProductRepository } from './yandex/MongoProductRepository';
import { MongoOrderRepository } from './yandex/MongoOrderRepository';
import { MongoReviewRepository } from './yandex/MongoReviewRepository';
import { MongoCategoryRepository } from './yandex/MongoCategoryRepository';
import { MongoSettingsRepository } from './yandex/MongoSettingsRepository';
import { S3StorageRepository } from './yandex/S3StorageRepository';
import { MongoAuthRepository } from './yandex/MongoAuthRepository';
import { YandexFunctionsRepository } from './yandex/YandexFunctionsRepository';

// ============================================================================
// DATA ACCESS LAYER
// Yandex (MongoDB + S3) is the exclusive data provider.
// ============================================================================

export const ProductRepository = new MongoProductRepository();
export const OrderRepository = new MongoOrderRepository();
export const ReviewRepository = new MongoReviewRepository();
export const CategoryRepository = new MongoCategoryRepository();
export const SettingsRepository = new MongoSettingsRepository();
export const StorageRepository = new S3StorageRepository();
export const AuthRepository = new MongoAuthRepository();
export const FunctionsRepository = new YandexFunctionsRepository();
