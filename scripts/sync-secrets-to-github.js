#!/usr/bin/env node
/**
 * sync-secrets-to-github.js
 * Reads .env.local + functions/.env, merges them (functions/.env wins),
 * and pushes every required secret to GitHub via `gh secret set`.
 *
 * Usage:  node scripts/sync-secrets-to-github.js
 */

'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const REPO = 'MAStif55/somanatha-shop';
const ROOT = path.resolve(__dirname, '..');

// ── Colour helpers ────────────────────────────────────────────────────────────
const c = {
  ok:   (s) => `\x1b[32m  [OK]  ${s}\x1b[0m`,
  fail: (s) => `\x1b[31m  [!!]  ${s}\x1b[0m`,
  skip: (s) => `\x1b[33m  [--]  ${s}\x1b[0m`,
  info: (s) => `\x1b[36m  [i]   ${s}\x1b[0m`,
  head: (s) => `\x1b[1m\x1b[36m${s}\x1b[0m`,
};

// ── Parse .env file ───────────────────────────────────────────────────────────
function parseDotenv(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    vars[key] = val;
  }
  return vars;
}

// ── Push one secret via gh CLI ────────────────────────────────────────────────
function pushSecret(key, value) {
  if (!value || value.includes('your_') || value.includes('_here')) {
    console.log(c.skip(`${key}  (placeholder value — skipping)`));
    return 'skip';
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Pipe value via stdin to avoid shell escaping issues entirely
      execSync(`gh secret set ${key} --repo ${REPO}`, {
        input: value,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      console.log(c.ok(key));
      return 'ok';
    } catch (e) {
      const errMsg = (e.stderr || e.message || '').trim();
      if (attempt < 3) {
        process.stdout.write(`    Attempt ${attempt} failed (${errMsg.slice(0,60)}), retrying...\n`);
        // Small sleep: spin for 2 seconds
        const t = Date.now() + 2000;
        while (Date.now() < t) {}
      } else {
        console.log(c.fail(`${key}  →  ${errMsg.slice(0, 80)}`));
        return 'fail';
      }
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log('');
  console.log(c.head('============================================================'));
  console.log(c.head('  SOMANATHA SHOP — GitHub Secrets Sync'));
  console.log(c.head(`  Repo: ${REPO}`));
  console.log(c.head('============================================================'));
  console.log('');

  // Load and merge env files (functions/.env wins — has real production values)
  const envLocal     = parseDotenv(path.join(ROOT, '.env.local'));
  const envFunctions = parseDotenv(path.join(ROOT, 'functions', '.env'));
  const merged       = { ...envLocal, ...envFunctions };

  console.log(c.info(`Loaded ${Object.keys(envLocal).length} vars from .env.local`));
  console.log(c.info(`Loaded ${Object.keys(envFunctions).length} vars from functions/.env`));
  console.log(c.info(`Merged: ${Object.keys(merged).length} unique keys`));
  console.log('');

  // ── Secret manifest: [GitHub secret name, env key to source from] ──────────
  const manifest = [
    // Firebase Client SDK
    ['NEXT_PUBLIC_FIREBASE_API_KEY',            'NEXT_PUBLIC_FIREBASE_API_KEY'],
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID',         'NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
    ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',     'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
    ['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID','NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
    ['NEXT_PUBLIC_FIREBASE_APP_ID',             'NEXT_PUBLIC_FIREBASE_APP_ID'],
    ['NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',     'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'],
    // Telegram
    ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_TOKEN'],
    ['TELEGRAM_CHAT_ID',   'TELEGRAM_CHAT_ID'],
    // SMTP / Email
    ['SMTP_HOST',  'SMTP_HOST'],
    ['SMTP_PORT',  'SMTP_PORT'],
    ['SMTP_USER',  'SMTP_USER'],
    ['SMTP_PASS',  'SMTP_PASS'],
    ['EMAIL_FROM', 'EMAIL_FROM'],
    ['EMAIL_TO',   'EMAIL_TO'],
    // YooKassa
    ['YOOKASSA_SHOP_ID',    'YOOKASSA_SHOP_ID'],
    ['YOOKASSA_SECRET_KEY', 'YOOKASSA_SECRET_KEY'],
  ];

  let ok = 0, fail = 0, skip = 0;

  console.log(`  Pushing ${manifest.length} secrets...\n`);
  for (const [secret, envKey] of manifest) {
    const result = pushSecret(secret, merged[envKey]);
    if (result === 'ok')   ok++;
    if (result === 'fail') fail++;
    if (result === 'skip') skip++;
  }

  // ── Firebase Service Account ──────────────────────────────────────────────
  console.log('');
  console.log('  Checking for Firebase Service Account JSON...');

  const saPaths = [
    path.join(ROOT, 'serviceAccount.json'),
    path.join(ROOT, 'service-account.json'),
    path.join(ROOT, 'firebase-adminsdk.json'),
    path.join(ROOT, 'functions', 'serviceAccount.json'),
  ];

  // Also check Downloads folder on Windows
  const downloads = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads');
  if (fs.existsSync(downloads)) {
    for (const f of fs.readdirSync(downloads)) {
      if ((f.includes('somanatha') || f.includes('firebase')) && f.includes('adminsdk') && f.endsWith('.json')) {
        saPaths.unshift(path.join(downloads, f));
      }
    }
  }

  const saFile = saPaths.find(p => fs.existsSync(p));

  if (saFile) {
    const content = fs.readFileSync(saFile, 'utf-8');
    if (content.includes('"private_key_id"')) {
      console.log(c.info(`Found: ${saFile}`));
      const result = pushSecret('FIREBASE_SERVICE_ACCOUNT', content);
      if (result === 'ok') ok++;
      else fail++;
    } else {
      console.log(c.fail(`${saFile} is not a valid service account JSON`));
      fail++;
    }
  } else {
    console.log(c.fail('FIREBASE_SERVICE_ACCOUNT — file not found'));
    console.log('');
    console.log('\x1b[33m  ACTION REQUIRED: Download the Firebase Service Account key:\x1b[0m');
    console.log('');
    console.log('  1. Open this URL (already logged in as project owner):');
    console.log('\x1b[36m     https://console.firebase.google.com/project/somanatha-shop/settings/serviceaccounts/adminsdk\x1b[0m');
    console.log('  2. Click "Generate new private key" → confirm');
    console.log('  3. Save the downloaded file as:');
    console.log(`\x1b[36m     ${path.join(ROOT, 'serviceAccount.json')}\x1b[0m`);
    console.log('  4. Re-run:  node scripts/sync-secrets-to-github.js');
    console.log('');
    fail++;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  console.log(c.head('============================================================'));
  console.log(`\x1b[32m  OK:      ${ok} secrets uploaded\x1b[0m`);
  if (skip > 0) console.log(`\x1b[33m  SKIPPED: ${skip} secrets (placeholder values)\x1b[0m`);
  if (fail > 0) console.log(`\x1b[31m  FAILED:  ${fail} secrets\x1b[0m`);
  console.log(c.head('============================================================'));
  console.log('');

  if (fail === 0) {
    console.log('\x1b[32m  All secrets synced!\x1b[0m');
    console.log('  To trigger the first backup, run:');
    console.log(`\x1b[36m  gh workflow run backup.yml --repo ${REPO}\x1b[0m`);
    console.log('');
    process.exit(0);
  } else {
    // If only the service account failed, 16/17 is still a partial success — offer to trigger
    if (fail === 1 && !saFile) {
      console.log('\x1b[33m  16/17 secrets pushed. Only FIREBASE_SERVICE_ACCOUNT is missing.\x1b[0m');
      console.log('  Download the file, re-run this script, then trigger the backup.');
    }
    process.exit(1);
  }
}

main();
