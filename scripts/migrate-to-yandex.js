#!/usr/bin/env node
/**
 * migrate-to-yandex.js
 * ──────────────────────────────────────────────────────────────────────────
 * One-shot migration script: Firebase Firestore + Storage → MongoDB + Yandex S3
 * 
 * This script is READ-ONLY on the Firebase side — your live site stays 100% online.
 * 
 * What it does:
 *   1. Connects to Firebase (Firestore + Storage) using firebase-admin
 *   2. Connects to MongoDB on the Yandex VM via SSH tunnel or direct connection
 *   3. Copies all collections: products, orders, reviews, subcategories, 
 *      categoryVariations, settings
 *   4. Downloads all media from Firebase Storage and re-uploads to Yandex S3
 *   5. Updates image URLs in MongoDB documents to point to the new S3 bucket
 * 
 * Usage:
 *   node scripts/migrate-to-yandex.js
 * 
 * Requirements:
 *   - firebase-admin (already installed)
 *   - mongodb (already installed)
 *   - @aws-sdk/client-s3 (already installed)
 *   - SSH tunnel to MongoDB (or direct connection if running on the VM)
 */

'use strict';

const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http = require('http');
const path = require('path');

// ─── ANSI colours ────────────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m', bold: '\x1b[1m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    cyan: '\x1b[36m', grey: '\x1b[90m',
};
const log  = (msg) => console.log(msg);
const ok   = (msg) => console.log(`${C.green}  ✔${C.reset}  ${msg}`);
const warn = (msg) => console.log(`${C.yellow}  ⚠${C.reset}  ${msg}`);
const err  = (msg) => console.error(`${C.red}  ✖${C.reset}  ${msg}`);

// ─── CONFIG ──────────────────────────────────────────────────────────────────

// MongoDB on the Yandex VM (connect via SSH tunnel: ssh -L 27018:127.0.0.1:27017 yc-user@111.88.251.124)
const MONGO_URI = process.env.MONGO_MIGRATE_URI || 'mongodb://somanatha_app:SomanathaAppPass2026@127.0.0.1:27018/somanatha_data';
const MONGO_DB = 'somanatha_data';

// Yandex S3 Configuration
const S3_BUCKET = process.env.YC_S3_BUCKET || 'somanatha-media';
const S3_ENDPOINT = 'https://storage.yandexcloud.net';
const S3_REGION = 'ru-central1';

// Firebase Storage bucket
const FIREBASE_STORAGE_BUCKET = 'somanatha-shop.firebasestorage.app';

// Collections to migrate (Firestore collection name → MongoDB collection name)
const COLLECTIONS = [
    'products',
    'orders',
    'reviews',
    'subcategories',
    'categoryVariations',
    'settings',
];

// ─── FIREBASE INIT ───────────────────────────────────────────────────────────

function initFirebase() {
    if (admin.apps.length > 0) return;

    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (b64) {
        const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
        admin.initializeApp({
            credential: admin.credential.cert(sa),
            storageBucket: FIREBASE_STORAGE_BUCKET,
        });
        return;
    }

    // ADC fallback (firebase login)
    admin.initializeApp({
        projectId: 'somanatha-shop',
        storageBucket: FIREBASE_STORAGE_BUCKET,
    });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function sanitizeDoc(data) {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;
    if (typeof data.toDate === 'function') return data.toDate().getTime(); // Convert to epoch ms
    if (data._latitude !== undefined && data._longitude !== undefined) {
        return { lat: data._latitude, lng: data._longitude };
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

// ─── PHASE 1: DATA MIGRATION ────────────────────────────────────────────────

async function migrateData(firestoreDb, mongoDb) {
    log(`\n${C.bold}${C.cyan}── Phase 1: Data Migration (Firestore → MongoDB) ──${C.reset}\n`);

    const stats = {};

    for (const colName of COLLECTIONS) {
        process.stdout.write(`  Migrating ${C.bold}${colName}${C.reset} ... `);

        try {
            const snapshot = await firestoreDb.collection(colName).get();

            if (snapshot.empty) {
                process.stdout.write(`${C.grey}(empty)${C.reset}\n`);
                stats[colName] = 0;
                continue;
            }

            const docs = [];
            for (const doc of snapshot.docs) {
                const data = sanitizeDoc(doc.data());
                // Store the original Firestore ID as _id for compatibility
                docs.push({ _id: doc.id, ...data });
            }

            // Drop existing data in the target collection (idempotent re-run)
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

// ─── PHASE 2: MEDIA MIGRATION ───────────────────────────────────────────────

async function migrateMedia(mongoDb, s3Client) {
    log(`\n${C.bold}${C.cyan}── Phase 2: Media Migration (Firebase Storage → Yandex S3) ──${C.reset}\n`);

    // Find all image and video URLs in products
    const products = await mongoDb.collection('products').find({}).toArray();
    let totalUploaded = 0;
    let totalFailed = 0;
    const urlMap = new Map(); // old URL → new URL

    for (const product of products) {
        const urls = [];

        // Collect image URLs
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

        // Collect video URLs
        if (product.videoPreviewUrl && product.videoPreviewUrl.includes('firebase')) {
            urls.push({ field: 'videoPreviewUrl', url: product.videoPreviewUrl });
        }
        if (product.videoUrl && product.videoUrl.includes('firebase')) {
            urls.push({ field: 'videoUrl', url: product.videoUrl });
        }

        for (const { field, url } of urls) {
            // Skip if we already processed this URL
            if (urlMap.has(url)) continue;

            try {
                // Generate S3 key from the Firebase URL path
                const decodedUrl = decodeURIComponent(url);
                let s3Key;
                
                // Extract meaningful path from Firebase Storage URL
                const pathMatch = decodedUrl.match(/\/o\/(.+?)(\?|$)/);
                if (pathMatch) {
                    s3Key = pathMatch[1];
                } else {
                    // Fallback: use product ID + field name
                    const ext = url.match(/\.(jpg|jpeg|png|webp|mp4|gif)/) ? url.match(/\.(jpg|jpeg|png|webp|mp4|gif)/)[0] : '.bin';
                    s3Key = `products/${product._id}/${field}${ext}`;
                }

                process.stdout.write(`  ${C.grey}↓${C.reset} ${s3Key.substring(0, 60)}... `);

                // Download from Firebase
                const buffer = await downloadUrl(url);

                // Determine content type
                let contentType = 'application/octet-stream';
                if (s3Key.endsWith('.jpg') || s3Key.endsWith('.jpeg')) contentType = 'image/jpeg';
                else if (s3Key.endsWith('.png')) contentType = 'image/png';
                else if (s3Key.endsWith('.webp')) contentType = 'image/webp';
                else if (s3Key.endsWith('.gif')) contentType = 'image/gif';
                else if (s3Key.endsWith('.mp4')) contentType = 'video/mp4';

                // Upload to Yandex S3
                await s3Client.send(new PutObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: s3Key,
                    Body: buffer,
                    ContentType: contentType,
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

    // Phase 2b: Update URLs in MongoDB
    if (urlMap.size > 0) {
        log(`\n  ${C.bold}Updating ${urlMap.size} URLs in MongoDB...${C.reset}`);

        for (const product of products) {
            const update = {};
            let needsUpdate = false;

            // Update image URLs
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

    // 1. Init Firebase
    log(`${C.grey}Initializing Firebase Admin SDK...${C.reset}`);
    initFirebase();
    const firestoreDb = admin.firestore();
    ok('Firebase connected');

    // 2. Init MongoDB
    log(`${C.grey}Connecting to MongoDB on Yandex VM...${C.reset}`);
    const mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    const mongoDb = mongoClient.db(MONGO_DB);
    ok(`MongoDB connected (${MONGO_DB})`);

    // 3. Init S3
    log(`${C.grey}Initializing Yandex S3 client...${C.reset}`);
    const s3Client = new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        credentials: {
            accessKeyId: process.env.YC_S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.YC_S3_SECRET_ACCESS_KEY || '',
        },
    });
    ok(`S3 client initialized (bucket: ${S3_BUCKET})`);

    // 4. Migrate Data
    const dataStats = await migrateData(firestoreDb, mongoDb);

    // 5. Migrate Media (only if S3 credentials are provided)
    let mediaStats = { uploaded: 0, failed: 0, urlsRemapped: 0 };
    if (process.env.YC_S3_ACCESS_KEY_ID) {
        mediaStats = await migrateMedia(mongoDb, s3Client);
    } else {
        warn('YC_S3_ACCESS_KEY_ID not set — skipping media migration.');
        warn('Media URLs in MongoDB will still point to Firebase Storage (which is fine for now).');
    }

    // 6. Summary
    log(`\n${C.bold}${'═'.repeat(58)}${C.reset}`);
    log(`${C.bold}${C.green}  ✅  MIGRATION COMPLETE${C.reset}\n`);
    log(`  ${C.bold}Data:${C.reset}`);
    for (const [col, count] of Object.entries(dataStats)) {
        if (count >= 0) {
            log(`    ${col}: ${C.green}${count}${C.reset} documents`);
        } else {
            log(`    ${col}: ${C.red}FAILED${C.reset}`);
        }
    }
    log(`\n  ${C.bold}Media:${C.reset}`);
    log(`    Uploaded:    ${C.green}${mediaStats.uploaded}${C.reset} files`);
    log(`    Failed:      ${mediaStats.failed > 0 ? C.red : C.grey}${mediaStats.failed}${C.reset}`);
    log(`    URLs remapped: ${mediaStats.urlsRemapped}`);
    log(`\n${C.bold}${'═'.repeat(58)}${C.reset}\n`);

    await mongoClient.close();
    process.exit(0);
}

main().catch(e => {
    err(`Unhandled error: ${e.stack || e.message}`);
    process.exit(1);
});
