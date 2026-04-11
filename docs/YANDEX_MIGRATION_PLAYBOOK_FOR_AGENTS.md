# Yandex Cloud Migration Playbook for Agents

## Context
This playbook is an authoritative, step-by-step guide crafted specifically for AI coding agents. It details the precise steps, architectural decisions, and edge-cases necessary to execute a successful migration of a Firebase-coupled application (Next.js/React) to a completely sovereign, self-managed infrastructure on Yandex Cloud.

---

## 1. Prerequisites and Source Preparation

### A. Access Files and Initial Configuration
*   **Authentication Key:** The global Yandex Cloud access file (`authorized_key.json`) **must** be located in the root directory of the application workspace.
*   Agents must use this key to authenticate with Yandex CLI or Terraform tools if orchestrating infrastructure automatically. If managing storage natively via S3 APIs, traditional `ACCESS_KEY_ID` and `SECRET_ACCESS_KEY` environment variables are preferred.

### B. Multi-Tenant Architecture (Same VM, Separate Folders)
*   You do **not** necessarily need to spin up a brand new Virtual Machine for every single website. 
*   **To save costs, you will host multiple websites on a single Yandex Virtual Machine.** To do this, the projects are physically separated by distinct filesystem folders inside `/var/www/`.

#### STRICT ARCHITECTURE MAPPING (DO NOT DEVIATE):
When attempting to migrate or modify the other websites on this architecture, AI Agents **MUST** strictly adhere to the following mapping to prevent port collisions and database corruption:

1.  **Somanatha Shop**
    *   **Folder:** `/var/www/somanatha-shop`
    *   **Git Repo:** `/var/repo/somanatha-shop.git`
    *   **PM2 Port:** `3000`
    *   **Database:** `somanatha_data`
    *   **PM2 App Name:** `somanatha-shop`

2.  **Dekorativ** (декоратив.рф)
    *   **Folder:** `/var/www/dekorativ`
    *   **Git Repo:** `/var/repo/dekorativ.git`
    *   **PM2 Port:** `3001`
    *   **Database:** `dekorativ_data`
    *   **PM2 App Name:** `dekorativ`

3.  **LevPrav**
    *   **Folder:** `/var/www/levprav`
    *   **Git Repo:** `/var/repo/levprav.git`
    *   **PM2 Port:** `3002`
    *   **Database:** `levprav_data`
    *   **PM2 App Name:** `levprav`

*   **Nginx Routing:** Create a new Nginx server block (`/etc/nginx/sites-available/[project-name]`) that listens for the specific domain name and proxies traffic to the assigned internal port mapping listed above.

---

## 2. Infrastructure Target Architecture
*   **Application Virtual Machine:** A high-compute Yandex Compute OS (Ubuntu 22.04 LTS).
*   **Application Runtime:** Next.js (App Router) managed by `PM2` daemon.
*   **Database:** MongoDB running natively (`localhost:27017`), fully replacing Firebase Firestore.
*   **Object Storage:** Yandex Object Storage (S3 API compatible bucket `storage.yandexcloud.net`), replacing Firebase Storage.
*   **Reverse Proxy:** Nginx caching and routing traffic mapping port `80/443` to `3000`.
*   **Deployment Pipeline:** A specialized Git `post-receive` bare-repo hook acting as a local CI/CD pipeline on the VM.

---

## 3. Step-by-Step Execution Phases

### Phase 1: Decoupling the Codebase (The Repository Pattern)
Firebase SDKs historically couple UI client components tightly with database listeners, which makes migrations lethal if not abstracted.
1.  Implement a strict **Repository Pattern** interface. All database interactions should pass through `IProductRepository`, `IAuthRepository`, etc.
2.  Remove **all** `firebase/firestore`, `firebase/auth`, and `firebase/storage` imports from the Next.js `src/app` and `src/components`.
3.  Wrap all data mutations and reads inside Next.js **Server Actions** (`'use server'`).
4.  **Static Export Prohibition:** You MUST remove `output: 'export'` from the `next.config.mjs` or `next.config.js` file. The Yandex VM will run a live, dynamic Node process (via PM2) to evaluate Server Actions and API routes. If left active, PM2 will loop a `502 Bad Gateway` crash with the error: *"next start does not work with output: export"*.
5.  **Verification Check:** Ensure `npm run build` completely strips Firebase dependencies from the client bundle to allow static compiling.

### Phase 2: Solving the "Split-Brain" Execution Environment
Cloud Functions (like Payment integrations or Telegram bots) are easily forgotten during database migrations.
1.  **Do not rely on old Firebase Cloud Functions.** Even if the front-end reads from the new Database, legacy webhooks will write orders into the old Firebase Database.
2.  Port all legacy cloud operations (YooKassa integrations, SMTP Mailers, Webhooks) cleanly into standard Next.js Route Handlers (`src/app/api/...`).
3.  Ensure the new API Handlers query the new Database Repositories.

### Phase 3: Data & Media Migration
Execute one-shot Node.js scripts to pull from Firebase and push to Yandex natively.
1.  **Relational Data:** Query all Firestore records. Explicitly transform Firebase `Timestamp` objects into localized UNIX Epoch bounds (`Date.now()`). Use `MongoClient` to `insertMany` into the target Yandex node.
2.  **Auth Data:** Iterate through Firebase Admin SDK users. Map to a bespoke `admin_users` MongoDB collection using `crypto` HMAC SHA-256 for local passwords.
3.  **Media Assets:** Use `@aws-sdk/client-s3` to pipe binary streams directly from Firebase Storage bucket to the Yandex bucket (`storage.yandexcloud.net`).

### Phase 4: Production Routing & Node Setup
1.  Deploy a local bare repo inside the Yandex VM (`git init --bare /var/repo/[project].git`).
2.  Implement a `post-receive` script that automatically clones into `/var/www/[project]`, executes `npm ci`, calculates the `npm run build`, and `pm2 restart [project]`.
3.  Establish an Nginx configuration tunneling traffic into pm2.

---

## 4. Critical Blockers & Edge Cases (CRITICAL READ)

### A: Browser "Private Network Access" (PNA) Media Blocks
*   **The Threat:** Chromium browsers will block `<img>` and `<video>` tags pulling from `storage.yandexcloud.net` with `net::ERR_FAILED` accompanied by a CORS "Private Network Access" warning. Chrome mistakenly perceives edge nodes as local network gateways.
*   **The Mitigation:** The application **must** be served via HTTPS. PNA restrictions are completely waived if the parent app originates from a Secure Context. Additionally, explicitly apply a permissive CORS policy using the AWS SDK `PutBucketCorsCommand` onto the Yandex Bucket.

### B: Cyrillic / Non-ASCII Asset URL Failure
*   **The Threat:** Files uploaded to S3 containing native Russian characters (e.g. `.../uploads/Амулет.webp`) cause `next/image` internal routing engines to crash with 500 errors.
*   **The Mitigation:** Purge `next/image` usage for remote Yandex storage configurations. Use native `<img src="...">` tags, and forcibly wrap every source URL in standard JavaScript `encodeURI()` handlers to neutralize space/Unicode corruption.

### C: Next.js Auth Cookies Silent Dropping
*   **The Threat:** By enforcing `cookies().set(..., { secure: true })` inside Server Actions for Session tokens, agents break site functionality when testing on HTTP IP addresses (`http://111.88.251.124`). The browser silently drops the Auth cookie, initiating an infinite login loop.
*   **The Mitigation:** Dynamically evaluate Node environments: `secure: process.env.NODE_ENV === 'production'`. Do not force secure cookies until the SSL tunnel is verified.

### D: Next.js Router Race Conditions
*   **The Threat:** Post-authentication flow utilizing `router.push('/admin'); window.location.reload();` to force rehydration explicitly creates a race condition. The underlying client-side router transition is canceled by the reload, resulting in the manager staying stuck on the `/login` screen.
*   **The Mitigation:** Eliminate React context router overrides during sensitive global state shifts. Force a hard OS redirect using `window.location.href = '/admin'`.

### E: Next.js 'output: export' 502 PM2 Crash Loop
*   **The Threat:** Firebase applications historically enforce `output: 'export'` inside `next.config.mjs` to generate flat HTML files for CDN delivery. Running `npm run start` on a static compilation will instigate a fatal crash blocking port traffic on the Yandex VM, resulting in a persistent Nginx 502 Bad Gateway error. 
*   **The Mitigation:** Strip `output: 'export'` entirely before pushing to the `yandex` remote so Next.js utilizes the standard Node HTTP server pipeline natively. If you forget to remove it, you must delete the entire `.next` build folder on the Yandex machine before rebuilding to clear the stale static configuration.
