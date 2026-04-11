const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const readline = require('readline');

// Using the same tunnel URI or default production URI pattern
const uri = process.env.MONGO_URI || 'mongodb://somanatha_app:SomanathaAppPass2026@127.0.0.1:27018/somanatha_data';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
    console.log('\n=== Admin User Manager ===');
    console.log('Note: If running locally, ensure your SSH tunnel to Yandex Cloud (port 27018) is open.\n');

    const action = await askQuestion('What would you like to do?\n1. Add a new admin user\n2. Reset an existing admin password\nChoice (1 or 2): ');

    if (action !== '1' && action !== '2') {
        console.log('Invalid choice. Exiting.');
        process.exit(1);
    }

    const email = await askQuestion('Enter the admin email address: ');
    const password = await askQuestion('Enter the new password: ');

    if (!email || !password || password.length < 5) {
        console.log('Invalid email or password too short. Exiting.');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();
        const collection = db.collection('admin_users');
        const hashedPass = hashPassword(password);

        if (action === '1') {
            // Add new user
            const existingUser = await collection.findOne({ email });
            if (existingUser) {
                console.log('\n❌ Error: A user with this email already exists!');
            } else {
                await collection.insertOne({ email, passwordHash: hashedPass, createdAt: Date.now() });
                console.log(`\n✅ Success: New admin user (${email}) created!`);
            }
        } else if (action === '2') {
            // Reset existing user
            const result = await collection.updateOne(
                { email },
                { $set: { passwordHash: hashedPass } }
            );
            if (result.matchedCount === 0) {
                console.log(`\n❌ Error: Could not find an admin user with email ${email}`);
            } else {
                console.log(`\n✅ Success: Password reset successfully for ${email}!`);
            }
        }
    } catch (err) {
        console.error('\n❌ Database Connection Error:', err.message);
        console.log('Did you forget to open your SSH tunnel? (ssh -N -L 27018:127.0.0.1:27017 yc-user@111.88.251.124)');
    } finally {
        await client.close();
        rl.close();
    }
}

main();
