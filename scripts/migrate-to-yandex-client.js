#!/usr/bin/env node
/**
 * migrate-to-yandex-client.js
 * ──────────────────────────────────────────────────────────────────────────
 * Client-Side SDK Migration script: Firebase Firestore + Storage → MongoDB + Yandex S3
 * 
 * Uses Firebase Client SDK so it doesn't require Google Application Credentials.
 */

'use strict';

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { MongoClient } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http = require('http');

// ─── ANSI colours ────────────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m', bold: '\x1b[1m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    cyan: '\x1b[36m', grey: '\x1b[90m',
};
const log = (msg) => console.log(msg);
const ok = (msg) => console.log(`${C.green}  ✔${C.reset}  ${msg}`);
const warn = (msg) => console.log(`${C.yellow}  ⚠${C.reset}  ${msg}`);
const err = (msg) => console.error(`${C.red}  ✖${C.reset}  ${msg}`);

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBL7rUz7qDIriLDRxmIRUCy-wZILQRyYNo",
    authDomain: "somanatha-shop.firebaseapp.com",
    projectId: "somanatha-shop",
    storageBucket: "somanatha-shop.firebasestorage.app",
    messagingSenderId: "58073963893",
    appId: "1:58073963893:web:cc4b6d3506e03d7a8e873c",
};

const MONGO_URI = process.env.MONGO_MIGRATE_URI || 'mongodb://somanatha_app:SomanathaAppPass2026@127.0.0.1:27018/somanatha_data';
const MONGO_DB = 'somanatha_data';

const S3_BUCKET = process.env.YC_S3_BUCKET || 'somanatha-media';
const S3_ENDPOINT = 'https://storage.yandexcloud.net';
const S3_REGION = 'ru-central1';

const COLLECTIONS = ['products', 'orders', 'reviews', 'subcategories', 'categoryVariations'];

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function sanitizeDoc(data) {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;
    
    // Firestore Timestamp from client SDK
    if (typeof data.toDate === 'function') return data.toDate().getTime(); 
    
    // GeoPoint
    if (data._lat !== undefined && data._long !== undefined) {
        return { lat: data._lat, lng: data._long };
    }
    
    if (Array.isArray(data)) return data.map(sanitizeDoc);
    
    const out = {};
    for (const [k, v] of Object.entries(data)) {
        out[k] = sanitizeDoc(v);
    }
    return out;
}

function downloadUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadUrl(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// ─── Phase 1: Data Migration ────────────────────────────────────────────────

async function migrateData(mongoDb) {
    log(`\n${C.bold}${C.cyan}── Phase 1: Data Migration (Firestore → MongoDB) ──${C.reset}\n`);

    const stats = {};

    for (const colName of COLLECTIONS) {
        process.stdout.write(`  Migrating ${C.bold}${colName}${C.reset} ... `);

        try {
            const snapshot = await getDocs(collection(firestoreDb, colName));

            if (snapshot.empty) {
                process.stdout.write(`${C.grey}(empty)${C.reset}\n`);
                stats[colName] = 0;
                continue;
            }

            const docs = [];
            for (const doc of snapshot.docs) {
                const data = sanitizeDoc(doc.data());
                docs.push({ _id: doc.id, ...data });
            }

            await mongoDb.collection(colName).deleteMany({});
            await mongoDb.collection(colName).insertMany(docs);

            process.stdout.write(`${C.green}✔${C.reset} ${docs.length} documents\n`);
            stats[colName] = docs.length;
        } catch (error) {
            process.stdout.write(`${C.red}✖ FAILED${C.reset}\n`);
            err(`  ${colName}: ${error.message}`);
            stats[colName] = -1;
        }
    }

    return stats;
}

// ─── Phase 2: Media Migration ───────────────────────────────────────────────

async function migrateMedia(mongoDb, s3Client) {
    log(`\n${C.bold}${C.cyan}── Phase 2: Media Migration (Firebase Storage → Yandex S3) ──${C.reset}\n`);

    const products = await mongoDb.collection('products').find({}).toArray();
    let totalUploaded = 0;
    let totalFailed = 0;
    const urlMap = new Map();

    for (const product of products) {
        const urls = [];

        if (product.images && Array.isArray(product.images)) {
            for (const img of product.images) {
                if (typeof img === 'string' && img.includes('firebase')) {
                    urls.push({ field: 'image', url: img });
                } else if (typeof img === 'object') {
                    if (img.url && img.url.includes('firebase')) urls.push({ field: 'image.url', url: img.url });
                    if (img.cardUrl && img.cardUrl.includes('firebase')) urls.push({ field: 'image.cardUrl', url: img.cardUrl });
                    if (img.thumbUrl && img.thumbUrl.includes('firebase')) urls.push({ field: 'image.thumbUrl', url: img.thumbUrl });
                }
            }
        }

        if (product.videoPreviewUrl && product.videoPreviewUrl.includes('firebase')) urls.push({ field: 'videoPreviewUrl', url: product.videoPreviewUrl });
        if (product.videoUrl && product.videoUrl.includes('firebase')) urls.push({ field: 'videoUrl', url: product.videoUrl });

        for (const { field, url } of urls) {
            if (urlMap.has(url)) continue;

            try {
                const decodedUrl = decodeURIComponent(url);
                let s3Key;
                
                const pathMatch = decodedUrl.match(/\/o\/(.+?)(\?|$)/);
                if (pathMatch) {
                    s3Key = pathMatch[1];
                } else {
                    const extMatch = url.match(/\.(jpg|jpeg|png|webp|mp4|gif)/i);
                    const ext = extMatch ? extMatch[0] : '.bin';
                    s3Key = `products/${product._id}/${field}${ext}`;
                }

                process.stdout.write(`  ${C.grey}↓${C.reset} ${s3Key.substring(0, 60)}... `);

                const buffer = await downloadUrl(url);

                let contentType = 'application/octet-stream';
                if (s3Key.toLowerCase().endsWith('.jpg') || s3Key.toLowerCase().endsWith('.jpeg')) contentType = 'image/jpeg';
                else if (s3Key.toLowerCase().endsWith('.png')) contentType = 'image/png';
                else if (s3Key.toLowerCase().endsWith('.webp')) contentType = 'image/webp';
                else if (s3Key.toLowerCase().endsWith('.gif')) contentType = 'image/gif';
                else if (s3Key.toLowerCase().endsWith('.mp4')) contentType = 'video/mp4';

                await s3Client.send(new PutObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: s3Key,
                    Body: buffer,
                    ContentType: contentType,
                    ACL: 'public-read' // Just to be sure it's public
                }));

                const newUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`;
                urlMap.set(url, newUrl);
                totalUploaded++;
                process.stdout.write(`${C.green}✔${C.reset} (${(buffer.length / 1024).toFixed(0)} KB)\n`);
            } catch (error) {
                totalFailed++;
                process.stdout.write(`${C.red}✖${C.reset} ${error.message.substring(0, 60)}\n`);
            }
        }
    }

    if (urlMap.size > 0) {
        log(`\n  ${C.bold}Updating ${urlMap.size} URLs in MongoDB...${C.reset}`);

        for (const product of products) {
            const update = {};
            let needsUpdate = false;

            if (product.images && Array.isArray(product.images)) {
                const newImages = product.images.map(img => {
                    if (typeof img === 'string' && urlMap.has(img)) {
                        needsUpdate = true;
                        return urlMap.get(img);
                    }
                    if (typeof img === 'object') {
                        const newImg = { ...img };
                        if (img.url && urlMap.has(img.url)) { newImg.url = urlMap.get(img.url); needsUpdate = true; }
                        if (img.cardUrl && urlMap.has(img.cardUrl)) { newImg.cardUrl = urlMap.get(img.cardUrl); needsUpdate = true; }
                        if (img.thumbUrl && urlMap.has(img.thumbUrl)) { newImg.thumbUrl = urlMap.get(img.thumbUrl); needsUpdate = true; }
                        return newImg;
                    }
                    return img;
                });
                if (needsUpdate) update.images = newImages;
            }

            if (product.videoPreviewUrl && urlMap.has(product.videoPreviewUrl)) {
                update.videoPreviewUrl = urlMap.get(product.videoPreviewUrl);
                needsUpdate = true;
            }
            if (product.videoUrl && urlMap.has(product.videoUrl)) {
                update.videoUrl = urlMap.get(product.videoUrl);
                needsUpdate = true;
            }

            if (needsUpdate) {
                await mongoDb.collection('products').updateOne(
                    { _id: product._id },
                    { $set: update }
                );
            }
        }
        ok(`URLs updated in MongoDB`);
    }

    return { uploaded: totalUploaded, failed: totalFailed, urlsRemapped: urlMap.size };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
    log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗`);
    log(`║  🚀  SOMANATHA — FIREBASE → YANDEX MIGRATION SCRIPT    ║`);
    log(`╚══════════════════════════════════════════════════════════╝${C.reset}\n`);

    log(`${C.grey}Connecting to MongoDB via SSH Tunnel...${C.reset}`);
    const mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    const mongoDb = mongoClient.db(MONGO_DB);
    ok(`MongoDB connected (${MONGO_DB})`);

    // Note: The Yandex Object Storage uses standard S3 API with access keys.

    log(`${C.grey}Initializing Yandex S3 client...${C.reset}`);
    const s3Client = new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        credentials: { // User needs to provide these if not set, but let's assume they might be missing. We'll skip if missing.
            accessKeyId: process.env.YC_S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.YC_S3_SECRET_ACCESS_KEY || '',
        },
    });

    const dataStats = await migrateData(mongoDb);

    let mediaStats = { uploaded: 0, failed: 0, urlsRemapped: 0 };
    if (process.env.YC_S3_ACCESS_KEY_ID) {
        mediaStats = await migrateMedia(mongoDb, s3Client);
    } else {
        warn('YC_S3_ACCESS_KEY_ID not set — skipping media migration.');
    }

    log(`\n${C.bold}${'═'.repeat(58)}${C.reset}`);
    log(`${C.bold}${C.green}  ✅  MIGRATION COMPLETE${C.reset}\n`);
    log(`  ${C.bold}Data:${C.reset}`);
    for (const [col, count] of Object.entries(dataStats)) {
        log(`    ${col}: ${count >= 0 ? C.green + count + C.reset : C.red + 'FAILED' + C.reset} documents`);
    }
    
    await mongoClient.close();
    process.exit(0);
}

main().catch(e => {
    err(`Unhandled error: ${e.stack || e.message}`);
    process.exit(1);
});
