/**
 * Image Migration Script — Generate card/thumb variants for existing products
 * 
 * Prerequisites:
 *   1. npm install sharp (in the project root)
 *   2. Firebase Admin credentials (one of):
 *      - Set GOOGLE_APPLICATION_CREDENTIALS env to service-account.json path
 *      - Use `firebase login` for local ADC
 * 
 * Usage:
 *   node scripts/migrate-images.js                     # Process all products
 *   node scripts/migrate-images.js --dry-run            # Preview without changes
 *   node scripts/migrate-images.js --product-id <id>    # Process a single product
 */

const admin = require('firebase-admin');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const path = require('path');
const { URL } = require('url');

// ─── Parse CLI flags ────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const singleProductIdx = args.indexOf('--product-id');
const SINGLE_PRODUCT_ID = singleProductIdx !== -1 ? args[singleProductIdx + 1] : null;

// ─── Firebase Admin Init ────────────────────────────────────────────
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'somanatha-shop',
        storageBucket: 'somanatha-shop.firebasestorage.app',
    });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─── Variant config ─────────────────────────────────────────────────
const VARIANTS = [
    { suffix: '_card', maxDim: 600, quality: 82 },
    { suffix: '_thumb', maxDim: 300, quality: 75 },
];

// ─── Helpers ────────────────────────────────────────────────────────

/** Download a file from a URL and return it as a Buffer */
function downloadUrl(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
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

/** Extract Firebase Storage path from a download URL */
function extractStoragePath(downloadUrl) {
    try {
        const url = new URL(downloadUrl);
        // Firebase Storage URLs: /v0/b/{bucket}/o/{encodedPath}?alt=media&token=...
        const pathMatch = url.pathname.match(/\/o\/(.+)/);
        if (pathMatch) {
            return decodeURIComponent(pathMatch[1]);
        }
    } catch { }
    return null;
}

/** Generate a single resized WebP variant */
async function generateVariant(inputBuffer, maxDim, quality) {
    return sharp(inputBuffer)
        .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
}

/** Upload a buffer to Firebase Storage and return its public URL */
async function uploadVariant(storagePath, buffer) {
    const file = bucket.file(storagePath);
    await file.save(buffer, {
        metadata: {
            contentType: 'image/webp',
            cacheControl: 'public, max-age=31536000, immutable',
        },
    });

    // Make public and get URL
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

// Actually, for Firebase Storage with token-based access, let's use getSignedUrl or
// construct the download URL the same way the client SDK does.
async function getFirebaseDownloadUrl(storagePath) {
    const file = bucket.file(storagePath);
    const [metadata] = await file.getMetadata();
    const token = metadata.metadata?.firebaseStorageDownloadTokens;

    if (token) {
        return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
    }

    // Fallback: generate a new token
    const { v4: uuidv4 } = require('uuid');
    const newToken = uuidv4();
    await file.setMetadata({
        metadata: { firebaseStorageDownloadTokens: newToken },
    });
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${newToken}`;
}

async function uploadVariantAndGetUrl(storagePath, buffer) {
    const file = bucket.file(storagePath);
    const { v4: uuidv4 } = require('uuid');
    const token = uuidv4();

    await file.save(buffer, {
        metadata: {
            contentType: 'image/webp',
            cacheControl: 'public, max-age=31536000, immutable',
            metadata: {
                firebaseStorageDownloadTokens: token,
            },
        },
    });

    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

// ─── Main Processor ─────────────────────────────────────────────────

async function processImage(imageData, productId, imageIndex) {
    const url = typeof imageData === 'string' ? imageData : imageData.url;
    if (!url) return null;

    // Skip if already has variants
    if (typeof imageData !== 'string' && imageData.cardUrl && imageData.thumbUrl) {
        console.log(`    ⏭️  Image ${imageIndex} already has variants — skipping`);
        return null;
    }

    // Extract storage path
    const storagePath = extractStoragePath(url);
    if (!storagePath) {
        console.log(`    ⚠️  Image ${imageIndex}: Cannot parse storage path from URL`);
        return null;
    }

    const baseName = storagePath.replace(/\.webp$/i, '');

    console.log(`    📥 Downloading: ${path.basename(storagePath)}`);
    const buffer = await downloadUrl(url);
    console.log(`    📐 Original: ${(buffer.length / 1024).toFixed(1)} KB`);

    const results = {};

    for (const variant of VARIANTS) {
        const variantPath = `${baseName}${variant.suffix}.webp`;
        const variantBuffer = await generateVariant(buffer, variant.maxDim, variant.quality);
        console.log(`    🖼️  ${variant.suffix}: ${(variantBuffer.length / 1024).toFixed(1)} KB (${variant.maxDim}px)`);

        if (!DRY_RUN) {
            const variantUrl = await uploadVariantAndGetUrl(variantPath, variantBuffer);
            if (variant.suffix === '_card') results.cardUrl = variantUrl;
            if (variant.suffix === '_thumb') results.thumbUrl = variantUrl;
        } else {
            if (variant.suffix === '_card') results.cardUrl = `[DRY_RUN] ${variantPath}`;
            if (variant.suffix === '_thumb') results.thumbUrl = `[DRY_RUN] ${variantPath}`;
        }
    }

    return results;
}

async function migrateProduct(productDoc) {
    const productId = productDoc.id;
    const data = productDoc.data();
    const images = data.images || [];

    console.log(`\n🔸 Product: ${data.title?.ru || data.title?.en || productId} (${images.length} images)`);

    if (images.length === 0) {
        console.log('   No images — skipping.');
        return { processed: 0, skipped: 0, errors: 0 };
    }

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const updatedImages = [...images];

    for (let i = 0; i < images.length; i++) {
        try {
            const result = await processImage(images[i], productId, i);
            if (result) {
                // Merge variant URLs into the image data
                const existingImage = typeof images[i] === 'string'
                    ? { url: images[i], alt: { en: '', ru: '' } }
                    : { ...images[i] };

                updatedImages[i] = {
                    ...existingImage,
                    cardUrl: result.cardUrl,
                    thumbUrl: result.thumbUrl,
                };
                processed++;
            } else {
                skipped++;
            }
        } catch (err) {
            console.error(`    ❌ Image ${i} failed: ${err.message}`);
            errors++;
        }
    }

    // Update Firestore document
    if (processed > 0 && !DRY_RUN) {
        await db.collection('products').doc(productId).update({
            images: updatedImages,
        });
        console.log(`   ✅ Firestore updated with ${processed} new variants`);
    } else if (processed > 0 && DRY_RUN) {
        console.log(`   🏷️  [DRY RUN] Would update ${processed} images in Firestore`);
    }

    return { processed, skipped, errors };
}

// ─── Entry Point ────────────────────────────────────────────────────

async function main() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   Image Migration — Multi-Variant Gen   ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`Mode: ${DRY_RUN ? '🏷️  DRY RUN (no writes)' : '🔥 LIVE (will modify data)'}`);
    if (SINGLE_PRODUCT_ID) console.log(`Target: Single product — ${SINGLE_PRODUCT_ID}`);
    console.log('');

    let query;
    if (SINGLE_PRODUCT_ID) {
        const doc = await db.collection('products').doc(SINGLE_PRODUCT_ID).get();
        if (!doc.exists) {
            console.error(`❌ Product ${SINGLE_PRODUCT_ID} not found`);
            process.exit(1);
        }
        query = [doc];
    } else {
        const snapshot = await db.collection('products').get();
        query = snapshot.docs;
    }

    console.log(`📦 Found ${query.length} product(s) to process\n`);

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const doc of query) {
        const result = await migrateProduct(doc);
        totalProcessed += result.processed;
        totalSkipped += result.skipped;
        totalErrors += result.errors;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`✅ Done!  Processed: ${totalProcessed}  |  Skipped: ${totalSkipped}  |  Errors: ${totalErrors}`);
    if (DRY_RUN) console.log('🏷️  This was a DRY RUN — no data was modified.');
    console.log('═══════════════════════════════════════════\n');
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
