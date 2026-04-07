#!/usr/bin/env node
/**
 * restore-firestore.js
 * ──────────────────────────────────────────────────────────────────────────
 * Re-imports NDJSON exports back into Firestore (or any other target).
 * Reads from data/exports/*.ndjson produced by export-firestore.js.
 *
 * Safety rules (non-destructive by default):
 *   • SKIP mode (default) — skips documents that already exist in Firestore.
 *     Zero risk of overwriting live data.
 *   • MERGE mode (--merge) — merges incoming fields into existing documents.
 *     Use when you want to fill gaps without wiping current values.
 *   • OVERWRITE mode (--overwrite) — replaces documents entirely.
 *     ⚠ DESTRUCTIVE. Requires explicit --overwrite flag.
 *
 * Auth (same as export-firestore.js):
 *   1. FIREBASE_SERVICE_ACCOUNT_BASE64
 *   2. GOOGLE_APPLICATION_CREDENTIALS
 *   3. Application Default Credentials
 *
 * Usage:
 *   node scripts/restore-firestore.js
 *   node scripts/restore-firestore.js --in ./recovery/data/exports
 *   node scripts/restore-firestore.js --collections products,settings
 *   node scripts/restore-firestore.js --merge
 *   node scripts/restore-firestore.js --overwrite   # ⚠ destructive
 *   node scripts/restore-firestore.js --dry-run     # simulates, no writes
 */

'use strict';

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');
const readline = require('readline');

// ─── ANSI colours ────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', grey: '\x1b[90m', magenta: '\x1b[35m',
};
const log  = (msg) => console.log(msg);
const ok   = (msg) => console.log(`${C.green}  ✔${C.reset}  ${msg}`);
const warn = (msg) => console.log(`${C.yellow}  ⚠${C.reset}  ${msg}`);
const err  = (msg) => console.error(`${C.red}  ✖${C.reset}  ${msg}`);
const info = (msg) => console.log(`${C.cyan}  ℹ${C.reset}  ${msg}`);

// ─── NDJSON file → Firestore collection mapping ───────────────────────────────
const FILE_MAP = [
  { file: 'products.ndjson',      collection: 'products'      },
  { file: 'orders.ndjson',        collection: 'orders'        },
  { file: 'customers.ndjson',     collection: 'customers'     },
  { file: 'reviews.ndjson',       collection: 'reviews'       },
  { file: 'subcategories.ndjson', collection: 'subcategories' },
  { file: 'variations.ndjson',    collection: 'options'       }, // restored to 'options'
  { file: 'settings.ndjson',      collection: 'settings'      },
];

// Firestore max batch size
const BATCH_SIZE = 400;

// ─── CLI ARGS ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const has  = (flag) => args.includes(flag);
  const get  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

  const inDir     = get('--in') || path.join(process.cwd(), 'data', 'exports');
  const colFilter = get('--collections');
  const files     = colFilter
    ? FILE_MAP.filter(f => colFilter.split(',').includes(f.collection))
    : FILE_MAP;

  let writeMode = 'skip'; // default: non-destructive
  if (has('--merge'))     writeMode = 'merge';
  if (has('--overwrite')) writeMode = 'overwrite';

  const dryRun = has('--dry-run');

  return { inDir, files, writeMode, dryRun };
}

// ─── FIREBASE INIT ───────────────────────────────────────────────────────────

function initFirebase() {
  if (admin.apps.length > 0) return admin.firestore();

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    admin.initializeApp(); // ADC fallback
  }

  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

// ─── SAFETY PROMPT ───────────────────────────────────────────────────────────

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ─── NDJSON READER ───────────────────────────────────────────────────────────

/**
 * Reads an NDJSON file line by line.
 * Yields parsed objects, skipping blank lines and malformed JSON.
 */
async function* readNdjson(filePath) {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  let lineNo = 0;

  for await (const line of rl) {
    lineNo++;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      yield JSON.parse(trimmed);
    } catch {
      warn(`    Line ${lineNo}: invalid JSON, skipping.`);
    }
  }
}

// ─── RESTORE SINGLE COLLECTION ───────────────────────────────────────────────

async function restoreCollection(db, filePath, colName, writeMode, dryRun) {
  const stats = { imported: 0, skipped: 0, merged: 0, overwritten: 0, errors: 0, total: 0 };

  let batch      = db.batch();
  let batchCount = 0;

  /**
   * Flush the current batch to Firestore.
   */
  async function flushBatch() {
    if (batchCount === 0) return;
    if (!dryRun) await batch.commit();
    batch      = db.batch();
    batchCount = 0;
  }

  for await (const doc of readNdjson(filePath)) {
    stats.total++;
    const docId = doc._id;

    if (!docId) {
      warn(`    Doc #${stats.total}: missing _id field, skipping.`);
      stats.errors++;
      continue;
    }

    // Strip internal metadata fields before writing
    const { _id, _collection, _exportedAt, ...data } = doc;

    try {
      const ref = db.collection(colName).doc(docId);

      if (writeMode === 'skip') {
        if (!dryRun) {
          const snap = await ref.get();
          if (snap.exists) { stats.skipped++; continue; }
        }
        if (!dryRun) batch.set(ref, data);
        batchCount++;
        stats.imported++;

      } else if (writeMode === 'merge') {
        if (!dryRun) batch.set(ref, data, { merge: true });
        batchCount++;
        stats.merged++;

      } else if (writeMode === 'overwrite') {
        if (!dryRun) batch.set(ref, data);
        batchCount++;
        stats.overwritten++;
      }

      if (batchCount >= BATCH_SIZE) await flushBatch();

    } catch (e) {
      warn(`    Doc ${docId}: ${e.message}`);
      stats.errors++;
    }
  }

  await flushBatch();
  return stats;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const { inDir, files, writeMode, dryRun } = parseArgs();

  log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗`);
  log(`║   🔄  SOMANATHA — FIRESTORE RESTORE             ║`);
  log(`╚══════════════════════════════════════════════════╝${C.reset}\n`);

  log(`${C.grey}Input directory : ${inDir}${C.reset}`);
  log(`${C.grey}Write mode      : ${C.bold}${writeMode.toUpperCase()}${C.reset}`);
  if (dryRun) log(`${C.magenta}${C.bold}DRY RUN — no data will be written to Firestore${C.reset}`);
  log('');

  // ── Safety confirmation for destructive modes ────────────────────────────
  if (writeMode === 'overwrite' && !dryRun) {
    warn(`${C.bold}OVERWRITE mode will REPLACE existing documents!${C.reset}`);
    const answer = await confirm(
      `${C.red}${C.bold}  Type "yes" to confirm destructive restore: ${C.reset}`
    );
    if (answer !== 'yes') {
      log('\n  Aborted. No changes written.\n');
      process.exit(0);
    }
    log('');
  }

  // ── Check manifest ───────────────────────────────────────────────────────
  const manifestPath = path.join(inDir, '_manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      info(`Backup dated : ${manifest.exportedAt}`);
      info(`Source project: ${manifest.projectId}`);
      log('');
    } catch { /* ignore */ }
  }

  // ── Init Firebase ────────────────────────────────────────────────────────
  let db;
  try {
    db = initFirebase();
    ok('Firebase Admin SDK initialized');
  } catch (e) {
    err(`Firebase init failed: ${e.message}`);
    process.exit(1);
  }

  log('');

  const totalStats = { imported: 0, skipped: 0, merged: 0, overwritten: 0, errors: 0, total: 0 };

  // ── Process each collection ──────────────────────────────────────────────
  for (const { file, collection } of files) {
    const filePath = path.join(inDir, file);

    if (!fs.existsSync(filePath)) {
      warn(`${file} not found — skipping ${collection}`);
      continue;
    }

    const fileSizeKb = Math.round(fs.statSync(filePath).size / 1024);
    process.stdout.write(`  Restoring ${C.bold}${collection}${C.reset} from ${file} (${fileSizeKb} KB) ... `);

    try {
      const stats = await restoreCollection(db, filePath, collection, writeMode, dryRun);

      process.stdout.write(`${C.green}✔${C.reset}\n`);
      const parts = [];
      if (stats.imported   > 0) parts.push(`${stats.imported} imported`);
      if (stats.merged     > 0) parts.push(`${stats.merged} merged`);
      if (stats.overwritten> 0) parts.push(`${stats.overwritten} overwritten`);
      if (stats.skipped    > 0) parts.push(`${C.grey}${stats.skipped} skipped (already exist)${C.reset}`);
      if (stats.errors     > 0) parts.push(`${C.yellow}${stats.errors} errors${C.reset}`);
      log(`    ${C.grey}→ ${parts.join(', ')}${C.reset}`);

      totalStats.imported    += stats.imported;
      totalStats.skipped     += stats.skipped;
      totalStats.merged      += stats.merged;
      totalStats.overwritten += stats.overwritten;
      totalStats.errors      += stats.errors;
      totalStats.total       += stats.total;

    } catch (e) {
      process.stdout.write(`${C.red}✖ FAILED${C.reset}\n`);
      err(`  ${collection}: ${e.message}`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  log('');
  log(`${'─'.repeat(54)}`);

  const written = totalStats.imported + totalStats.merged + totalStats.overwritten;
  ok(`${C.bold}Restore complete!${C.reset}  ${totalStats.total} docs processed`);
  if (written     > 0) ok(`${written} documents written to Firestore`);
  if (totalStats.skipped > 0) info(`${totalStats.skipped} documents skipped (already existed)`);
  if (totalStats.errors  > 0) warn(`${totalStats.errors} documents had errors — check warnings above`);
  if (dryRun) warn(`DRY RUN — nothing was actually written`);
  log(`${'─'.repeat(54)}\n`);

  // ── Post-restore instructions ────────────────────────────────────────────
  if (written > 0 && !dryRun) {
    log(`${C.grey}Next steps:`);
    log(`  1. Verify data in Firebase Console → Firestore`);
    log(`  2. Upload media:  firebase storage:upload media/ --project YOUR_PROJECT_ID`);
    log(`  3. Deploy site :  npm run build && firebase deploy --only hosting`);
    log(`${C.reset}`);
  }
}

main().catch(e => {
  err(`Unhandled error: ${e.stack || e.message}`);
  process.exit(1);
});
