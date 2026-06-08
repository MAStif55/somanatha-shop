const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/somanatha_data';
const DB_NAME = process.env.MONGODB_DB_NAME || 'somanatha_data';

async function main() {
    console.log('\n=== Database Initialization script ===');
    console.log(`Connecting to: ${MONGODB_URI.replace(/:([^:@]{3})[^:@]+@/, ':$1***@')}`); // Mask password

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);

        console.log('\n⏳ Creating index for auth_tokens...');
        
        // Ensure TTL index for auth_tokens (expire after 1 hour)
        await db.collection('auth_tokens').createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: 3600 }
        );
        
        console.log('✅ Index for auth_tokens created successfully!');

    } catch (err) {
        console.error('\n❌ Database Connection Error:', err.message);
    } finally {
        await client.close();
        console.log('Database connection closed.\n');
        process.exit(0);
    }
}

main();
