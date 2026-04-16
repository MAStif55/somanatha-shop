const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const URI = 'mongodb://127.0.0.1:27017';
const email = 'swj20862@gmail.com';
const rawPassword = 'cyvmyw-sIrmam-nefsu3';
const dbs = ['somanatha_data', 'dekorativ_data', 'levprav_data'];

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function fixAdmin() {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Hash password properly using SHA-256 for all three stores
    const passwordHash = hashPassword(rawPassword);
    
    for (const dbName of dbs) {
      const db = client.db(dbName);
      const collection = db.collection('admin_users');
      await collection.updateOne(
        { email },
        { $set: { email, passwordHash, role: 'admin', updatedAt: Date.now() } },
        { upsert: true }
      );
      console.log('Successfully provisioned correct SHA-256 admin: ' + email + ' on DB: ' + dbName);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
fixAdmin();
