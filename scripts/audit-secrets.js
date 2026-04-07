#!/usr/bin/env node
/**
 * audit-secrets.js
 * ──────────────────────────────────────────────────────────────────────────
 * Pre-flight check: verifies that every environment variable required by
 * Somanatha Shop is present in the current environment (or in a .env.local
 * file). Run before building or deploying.
 *
 * Usage:
 *   node scripts/audit-secrets.js
 *   node scripts/audit-secrets.js --env .env.production.local
 *
 * Exit codes:
 *   0  — all required secrets are present
 *   1  — one or more required secrets are missing
 */

const fs   = require('fs');
const path = require('path');

// ─── ANSI colours (no external deps) ────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  grey:   '\x1b[90m',
};

// ─── MASTER SECRET REGISTRY ──────────────────────────────────────────────────
//
// Each entry:
//   key      — exact env var name
//   scope    — 'client' | 'server' | 'ci'
//   required — true = hard error, false = warning only
//   hint     — where to find / how to create this value
//
const SECRETS = [

  // ── Firebase Client SDK (baked into the browser bundle) ──────────────────
  {
    key: 'NEXT_PUBLIC_FIREBASE_API_KEY',
    scope: 'client', required: true,
    hint: 'Firebase Console → Project Settings → General → Web app → Config',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    scope: 'client', required: true,
    hint: 'Firebase Console → Project Settings → General → Web app → Config',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    scope: 'client', required: true,
    hint: 'Firebase project ID, e.g. "somanatha-shop"',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    scope: 'client', required: true,
    hint: 'Firebase Console → Storage → gs://your-bucket.appspot.com',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    scope: 'client', required: true,
    hint: 'Firebase Console → Project Settings → Cloud Messaging → Sender ID',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_APP_ID',
    scope: 'client', required: true,
    hint: 'Firebase Console → Project Settings → General → Web app → App ID',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
    scope: 'client', required: false,
    hint: 'Firebase Console → Project Settings → General → Web app → Measurement ID (Analytics)',
  },

  // ── Firebase Admin SDK / Server-side ─────────────────────────────────────
  {
    key: 'FIREBASE_SERVICE_ACCOUNT_BASE64',
    scope: 'ci', required: true,
    hint: 'Base64-encoded Firebase service account JSON. Generate: ' +
          'Firebase Console → Project Settings → Service accounts → Generate new private key. ' +
          'Then: base64 -w0 serviceAccount.json',
  },

  // ── API base URL (optional — has hardcoded fallback) ─────────────────────
  {
    key: 'NEXT_PUBLIC_API_BASE_URL',
    scope: 'client', required: false,
    hint: 'e.g. https://us-central1-somanatha-shop.cloudfunctions.net. ' +
          'Defaults to that value if omitted.',
  },

  // ── Telegram Bot (order & feedback notifications) ────────────────────────
  {
    key: 'TELEGRAM_BOT_TOKEN',
    scope: 'server', required: true,
    hint: 'From @BotFather on Telegram. Format: 123456789:AAF...',
  },
  {
    key: 'TELEGRAM_CHAT_ID',
    scope: 'server', required: true,
    hint: 'Your personal or group chat ID. Get via @userinfobot or API getUpdates.',
  },

  // ── SMTP / Email ─────────────────────────────────────────────────────────
  {
    key: 'SMTP_HOST',
    scope: 'server', required: true,
    hint: 'e.g. smtp.yandex.ru or smtp.gmail.com',
  },
  {
    key: 'SMTP_PORT',
    scope: 'server', required: true,
    hint: '465 (SSL) or 587 (STARTTLS)',
  },
  {
    key: 'SMTP_USER',
    scope: 'server', required: true,
    hint: 'Full email address used as SMTP login, e.g. shop@yourdomain.ru',
  },
  {
    key: 'SMTP_PASS',
    scope: 'server', required: true,
    hint: 'Email account password or app-specific password',
  },
  {
    key: 'EMAIL_FROM',
    scope: 'server', required: false,
    hint: 'Sender address, e.g. "Somanatha Shop <shop@yourdomain.ru>". Defaults to SMTP_USER.',
  },
  {
    key: 'EMAIL_TO',
    scope: 'server', required: false,
    hint: 'Recipient for order notifications. Defaults to SMTP_USER.',
  },

  // ── YooKassa Payment Gateway ──────────────────────────────────────────────
  {
    key: 'YOOKASSA_SHOP_ID',
    scope: 'server', required: true,
    hint: 'YooKassa Merchant Cabinet → Settings → Shop ID',
  },
  {
    key: 'YOOKASSA_SECRET_KEY',
    scope: 'server', required: true,
    hint: 'YooKassa Merchant Cabinet → Settings → Secret key',
  },

  // ── GitHub PAT (for the triggerDeploy Cloud Function) ────────────────────
  {
    key: 'GITHUB_PAT',
    scope: 'ci', required: false,
    hint: 'GitHub → Settings → Developer settings → Personal access tokens. ' +
          'Requires repo → workflow scope. Set as Firebase Function secret: ' +
          'firebase functions:secrets:set GITHUB_PAT',
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    vars[key] = val;
  }
  return vars;
}

function getValue(key, dotenvVars) {
  return process.env[key] || dotenvVars[key] || '';
}

function isMissing(value) {
  if (!value) return true;
  const lower = value.toLowerCase();
  return lower.includes('your_') || lower.includes('_here') || lower === 'undefined';
}

function maskValue(val) {
  if (!val || val.length < 8) return '****';
  return val.slice(0, 4) + '****' + val.slice(-2);
}

function scopeLabel(scope) {
  const map = { client: '🌐 client', server: '⚙️  server', ci: '🔧 CI/CD' };
  return map[scope] || scope;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  // Parse --env flag
  const args = process.argv.slice(2);
  const envFlag = args.indexOf('--env');
  const envFile = envFlag !== -1 ? args[envFlag + 1] : '.env.local';
  const envPath = path.resolve(process.cwd(), envFile);

  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗`);
  console.log(`║     🔍  SOMANATHA SHOP — SECRETS AUDIT          ║`);
  console.log(`╚══════════════════════════════════════════════════╝${C.reset}\n`);

  const dotenvVars = loadDotenv(envPath);
  const fileExists = fs.existsSync(envPath);

  console.log(`${C.grey}Checking env file: ${envPath}${C.reset}`);
  console.log(fileExists
    ? `${C.green}✔ Found ${Object.keys(dotenvVars).length} variables in ${path.basename(envPath)}${C.reset}`
    : `${C.yellow}⚠ File not found — checking process.env only${C.reset}`
  );
  console.log();

  const missing  = [];
  const warnings = [];
  const present  = [];

  for (const secret of SECRETS) {
    const val = getValue(secret.key, dotenvVars);
    const absent = isMissing(val);

    if (absent && secret.required) {
      missing.push(secret);
    } else if (absent && !secret.required) {
      warnings.push(secret);
    } else {
      present.push({ ...secret, maskedValue: maskValue(val) });
    }
  }

  // ── Print present ────────────────────────────────────────────────────────
  console.log(`${C.bold}✅  PRESENT (${present.length}/${SECRETS.length})${C.reset}`);
  for (const s of present) {
    console.log(`  ${C.green}✔${C.reset} ${s.key.padEnd(46)} ${C.grey}${scopeLabel(s.scope)}  ${s.maskedValue}${C.reset}`);
  }

  // ── Print optional warnings ──────────────────────────────────────────────
  if (warnings.length > 0) {
    console.log(`\n${C.bold}${C.yellow}⚠  OPTIONAL / NOT SET (${warnings.length})${C.reset}`);
    for (const s of warnings) {
      console.log(`  ${C.yellow}~${C.reset} ${s.key.padEnd(46)} ${C.grey}${scopeLabel(s.scope)}${C.reset}`);
      console.log(`    ${C.grey}↳ ${s.hint}${C.reset}`);
    }
  }

  // ── Print missing (required) ─────────────────────────────────────────────
  if (missing.length > 0) {
    console.log(`\n${C.bold}${C.red}❌  MISSING REQUIRED SECRETS (${missing.length})${C.reset}`);
    for (const s of missing) {
      console.log(`  ${C.red}✖${C.reset} ${C.bold}${s.key}${C.reset}`);
      console.log(`    ${C.grey}Scope: ${scopeLabel(s.scope)}${C.reset}`);
      console.log(`    ${C.yellow}How to get it: ${s.hint}${C.reset}`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(54)}`);
  if (missing.length === 0) {
    console.log(`${C.bold}${C.green}🎉 All required secrets are present. Safe to deploy!${C.reset}`);
  } else {
    console.log(`${C.bold}${C.red}🚨 ${missing.length} required secret(s) missing. Deployment will fail.${C.reset}`);
    console.log(`${C.grey}Add them to ${path.basename(envPath)} or your GitHub Secrets and re-run.${C.reset}`);
  }
  console.log(`${'─'.repeat(54)}\n`);

  process.exit(missing.length > 0 ? 1 : 0);
}

main();
