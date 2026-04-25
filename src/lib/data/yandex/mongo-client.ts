import { MongoClient, Db } from 'mongodb';

// ============================================================================
// YANDEX MONGODB CONNECTION SINGLETON
//
// Uses globalThis caching to prevent connection leaks during Next.js HMR.
// Includes connection health monitoring and automatic reconnection.
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://somanatha_app:SomanathaAppPass2026@127.0.0.1:27017/somanatha_data';
const DB_NAME = process.env.MONGODB_DB_NAME || 'somanatha_data';

// Use globalThis to survive HMR in development
const globalForMongo = globalThis as unknown as {
    _mongoClient?: MongoClient;
    _mongoDb?: Db;
    _mongoConnecting?: Promise<Db>;
};

export async function getDb(): Promise<Db> {
    // If we have a cached DB, verify the connection is still alive
    if (globalForMongo._mongoDb && globalForMongo._mongoClient) {
        try {
            // Lightweight ping to verify connection health
            await globalForMongo._mongoClient.db('admin').command({ ping: 1 });
            return globalForMongo._mongoDb;
        } catch {
            // Connection is dead — clean up and reconnect
            console.warn('[MongoDB] Connection lost, reconnecting...');
            globalForMongo._mongoClient = undefined;
            globalForMongo._mongoDb = undefined;
            globalForMongo._mongoConnecting = undefined;
        }
    }

    // Avoid multiple concurrent connection attempts
    if (globalForMongo._mongoConnecting) {
        return globalForMongo._mongoConnecting;
    }

    globalForMongo._mongoConnecting = (async () => {
        const client = new MongoClient(MONGODB_URI, {
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });

        await client.connect();

        // Monitor connection events
        client.on('close', () => {
            console.warn('[MongoDB] Connection closed');
            globalForMongo._mongoClient = undefined;
            globalForMongo._mongoDb = undefined;
            globalForMongo._mongoConnecting = undefined;
        });

        client.on('error', (err) => {
            console.error('[MongoDB] Connection error:', err.message);
        });

        const db = client.db(DB_NAME);

        globalForMongo._mongoClient = client;
        globalForMongo._mongoDb = db;
        globalForMongo._mongoConnecting = undefined;

        return db;
    })();

    return globalForMongo._mongoConnecting;
}

export async function closeDb(): Promise<void> {
    if (globalForMongo._mongoClient) {
        await globalForMongo._mongoClient.close();
        globalForMongo._mongoClient = undefined;
        globalForMongo._mongoDb = undefined;
        globalForMongo._mongoConnecting = undefined;
    }
}
