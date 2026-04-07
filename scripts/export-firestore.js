#!/usr/bin/env node
/**
 * export-firestore.js
 * ──────────────────────────────────────────────────────────────────────────
 * Exports every Firestore collection to NDJSON (newline-delimited JSON).
 * One file per collection, placed in data/exports/.
 *
 * Each exported document gets three metadata fields prepended:
 *   _id           — Firestore document ID
 *   _collection   — source collection name
 *   _exportedAt   — ISO-8601 timestamp of the export run
 *
 * Auth (priority order):
 *   1. FIREBASE_SERVICE_ACCOUNT_BASE64 env var (base64-encoded JSON)
 *   2. GOOGLE_APPLICATION_CREDENTIALS env var (path to JSON file)
 *   3. Application Default Credentials  (local `firebase login`)
 *
 * Usage:
 *   node scripts/export-firestore.js
 *   node scripts/export-firestore.js --out ./backup/data
 *   node scripts/export-firestore.js --collections products,orders
 *
 * Output:
 *   data/exports/products.ndjson
 *   data/exports/orders.ndjson
 *   data/exports/customers.ndjson
 *   data/exports/reviews.ndjson
 *   data/exports/subcategories.ndjson
 *   data/exports/variations.ndjson   (Firestore collection: 'options')
 *   data/exports/settings.ndjson
 *   data/exports/_manifest.json      (summary of the export run)
 */

'use strict';

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

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

// ─── CONFIG ───────────────────────────────────────────────────────────────────

// Collections to export and their output filenames
const COLLECTIONS = [
  { name: 'products',      file: 'products.ndjson'      },
  { name: 'orders',        file: 'orders.ndjson'        },
  { name: 'customers',     file: 'customers.ndjson'     },
  { name: 'reviews',       file: 'reviews.ndjson'       },
  { name: 'subcategories', file: 'subcategories.ndjson' },
  { name: 'options',       file: 'variations.ndjson'    }, // 'options' → variations
  { name: 'settings',      file: 'settings.ndjson'      },
];

const PAGE_SIZE = 500; // Documents per Firestore query page

// ─── CLI ARGS ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get  = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };

  const outDir      = get('--out') || path.join(process.cwd(), 'data', 'exports');
  const colFilter   = get('--collections');
  const collections = colFilter
    ? COLLECTIONS.filter(c => colFilter.split(',').includes(c.name))
    : COLLECTIONS;

  return { outDir, collections };
}

// ─── FIREBASE INIT ───────────────────────────────────────────────────────────

function initFirebase() {
  if (admin.apps.length > 0) return admin.firestore();

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    return admin.firestore();
  }

  // ADC fallback (GOOGLE_APPLICATION_CREDENTIALS or `firebase login`)
  admin.initializeApp();
  return admin.firestore();
}

// ─── CORE EXPORT ─────────────────────────────────────────────────────────────

/**
 * Recursively converts Firestore Timestamps and other special types
 * into plain JSON-serializable values.
 */
function sanitizeDoc(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  // Firestore Timestamp
  if (typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }

  // GeoPoint
  if (data._latitude !== undefined && data._longitude !== undefined) {
    return { lat: data._latitude, lng: data._longitude };
  }

  // Array
  if (Array.isArray(data)) return data.map(sanitizeDoc);

  // Plain object
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = sanitizeDoc(v);
  }
  return out;
}

/**
 * Exports a single Firestore collection to an NDJSON file.
 * Uses cursor-based pagination to handle collections > PAGE_SIZE docs.
 * Returns { count, skipped } stats.
 */
async function exportCollection(db, colName, outPath, exportedAt) {
  const stream = fs.createWriteStream(outPath, { encoding: 'utf-8' });

  let count   = 0;
  let skipped = 0;
  let lastDoc = null;

  try {
    while (true) {
      let q = db.collection(colName).orderBy('__name__').limit(PAGE_SIZE);
      if (lastDoc) q = q.startAfter(lastDoc);

      const snap = await q.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        try {
          const row = {
            _id:          doc.id,
            _collection:  colName,
            _exportedAt:  exportedAt,
            ...sanitizeDoc(doc.data()),
          };
          stream.write(JSON.stringify(row) + '\n');
          count++;
        } catch (docErr) {
          warn(`  Could not serialize doc ${doc.id}: ${docErr.message}`);
          skipped++;
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < PAGE_SIZE) break;
    }
  } finally {
    stream.end();
    await new Promise(res => stream.on('finish', res));
  }

  return { count, skipped };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const { outDir, collections } = parseArgs();

  log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗`);
  log(`║   📦  SOMANATHA — FIRESTORE NDJSON EXPORT       ║`);
  log(`╚══════════════════════════════════════════════════╝${C.reset}\n`);

  // Ensure output directory exists
  fs.mkdirSync(outDir, { recursive: true });
  log(`${C.grey}Output directory: ${outDir}${C.reset}\n`);

  // Init Firebase
  let db;
  try {
    db = initFirebase();
    ok('Firebase Admin SDK initialized');
  } catch (e) {
    err(`Firebase init failed: ${e.message}`);
    err('Make sure FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS is set,');
    err('or run `firebase login` first.');
    process.exit(1);
  }

  const exportedAt = new Date().toISOString();
  const manifest   = {
    exportedAt,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'somanatha-shop',
    collections: {},
  };

  log('');

  for (const col of collections) {
    const outPath = path.join(outDir, col.file);
    process.stdout.write(`  Exporting ${C.bold}${col.name}${C.reset} → ${col.file} ... `);

    try {
      const { count, skipped } = await exportCollection(db, col.name, outPath, exportedAt);
      const size = fs.statSync(outPath).size;

      process.stdout.write(`${C.green}✔${C.reset} ${count} docs`);
      if (skipped > 0) process.stdout.write(` ${C.yellow}(${skipped} skipped)${C.reset}`);
      if (count === 0) process.stdout.write(` ${C.grey}(empty collection)${C.reset}`);
      process.stdout.write('\n');

      manifest.collections[col.name] = {
        file:      col.file,
        count,
        skipped,
        sizeBytes: size,
      };
    } catch (e) {
      process.stdout.write(`${C.red}✖ FAILED${C.reset}\n`);
      warn(`  ${col.name}: ${e.message}`);
      manifest.collections[col.name] = { file: col.file, error: e.message };
    }
  }

  // Write manifest
  const manifestPath = path.join(outDir, '_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  const totalDocs = Object.values(manifest.collections)
    .reduce((s, c) => s + (c.count || 0), 0);

  log('');
  log(`${'─'.repeat(54)}`);
  ok(`${C.bold}Export complete!${C.reset}  ${totalDocs} total documents`);
  ok(`Manifest written → ${path.relative(process.cwd(), manifestPath)}`);
  log(`${'─'.repeat(54)}\n`);
}

main().catch(e => {
  err(`Unhandled error: ${e.stack || e.message}`);
  process.exit(1);
});
