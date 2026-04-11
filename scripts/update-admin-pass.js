const { MongoClient } = require('mongodb');
const crypto = require('crypto');
async function run() {
    const client = new MongoClient('mongodb://somanatha_app:SomanathaAppPass2026@127.0.0.1:27018/somanatha_data');
    await client.connect();
    const hash = crypto.createHash('sha256').update('SomanathaSecure2026!').digest('hex');
    await client.db().collection('admin_users').updateOne({ email: 'admin@somanatha.ru' }, { $set: { passwordHash: hash } });
    console.log('Password reset successfully!');
    process.exit();
}
run();
