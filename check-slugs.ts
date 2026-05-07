import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkDuplicates() {
    const client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();
    const db = client.db('somanatha');
    
    const products = await db.collection('products').find({}).toArray();
    
    const slugs = new Map();
    for (const p of products) {
        if (p.slug) {
            if (slugs.has(p.slug)) {
                console.log(`DUPLICATE SLUG FOUND: ${p.slug}`);
                console.log(`Product 1: ${slugs.get(p.slug)._id} - ${slugs.get(p.slug).title.ru} (status: ${slugs.get(p.slug).status})`);
                console.log(`Product 2: ${p._id} - ${p.title.ru} (status: ${p.status})`);
            } else {
                slugs.set(p.slug, p);
            }
        }
    }
    
    console.log("Done checking.");
    process.exit(0);
}

checkDuplicates();
