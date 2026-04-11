const { MongoClient } = require('mongodb');
const crypto = require('crypto');

async function run() {
    const client = new MongoClient('mongodb://somanatha_app:SomanathaAppPass2026@127.0.0.1:27017/somanatha_data');
    await client.connect();
    
    const admin = await client.db().collection('admin_users').findOne({ email: 'admin@somanatha.ru' });
    
    if (!admin) {
        const hash = crypto.createHash('sha256').update('admin').digest('hex');
        await client.db().collection('admin_users').insertOne({ email: 'admin@somanatha.ru', passwordHash: hash });
        console.log('Created admin account!');
    } else {
        const hash = crypto.createHash('sha256').update('admin').digest('hex');
        await client.db().collection('admin_users').updateOne({ email: 'admin@somanatha.ru' }, { $set: { passwordHash: hash } });
        console.log('Reset admin account password!');
    }
    process.exit(0);
}

run().catch(console.error);
