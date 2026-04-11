# Yandex Cloud Migration Playbook for Agents

## Context
This playbook is crafted specifically for AI coding agents. It details the precise steps, architectural decisions, and edge-cases encountered when migrating a Firebase-coupled Next.js application to a completely sovereign, self-managed infrastructure on Yandex Cloud.

---

## 1. Target Architecture
*   **Application Server:** Next.js (App Router) running via `PM2` on a Yandex Compute Cloud Virtual Machine (Ubuntu).
*   **Database:** MongoDB running natively on the same VM (`localhost:27017`), replacing Firebase Firestore.
*   **Storage:** Yandex Object Storage (S3 API compatibility), replacing Firebase Storage.
*   **Reverse Proxy:** Nginx caching and routing traffic to `localhost:3000`.
*   **Deployment:** A custom Git `post-receive` hook acting as a local CI/CD pipeline on the VM.

---

## 2. Migration Phases

### Phase 1: Decoupling the Codebase
Firebase SDKs deeply couple UI components with database listeners. Ensure strict adherence to a **Repository Pattern**.
*   Remove all `firebase/firestore`, `firebase/auth`, and `firebase/storage` imports from the Next.js `src/app` and `src/components`.
*   Wrap all data queries inside Next.js **Server Actions** (`'use server'`) to enforce server-side execution.
*   **Crucial Focus:** Ensure `next build` completely strips Firebase dependencies from the client bundle.

### Phase 2: Data & Media Migration
Execute one-shot Node.js scripts to pull from Firebase and push to Yandex.
*   **Relational Data:** Iterate over Firestore collections, sanitize data types (specifically Firebase Timestamp to UNIX epoch), and `insertMany` into MongoDB.
*   **Media Pipeline:** Use `@aws-sdk/client-s3` to upload assets to the Yandex bucket (`storage.yandexcloud.net`).

---

## 3. Critical Issues Encountered & Solutions

### A: Browser "Private Network Access" (PNA) Media Blocks
*   **The Problem:** `<img>` and `<video>` tags pulling from `storage.yandexcloud.net` were failing with `net::ERR_FAILED` and CORS Policy warnings indicating *"resource is in more-private address space local"*. Google Chrome perceives the Yandex Edge CDN as a local node and blocks public HTTP websites from fetching data from it.
*   **The Solution:** The application **must** be served via HTTPS (SSL Context). PNA restrictions drop entirely once the origin is a Secure Context. Additionally, explicitly apply a permissive CORS policy to the Yandex bucket using the `PutBucketCorsCommand`.

### B: Cyrillic Asset URLs Fails to Render
*   **The Problem:** Files uploaded to S3 containing Cyrillic characters or spaces (e.g., `.../uploads/Амулет.webp`) fail to load silently in HTML or cause `next/image` internal crashes.
*   **The Solution:** Force a strict encoding wrapper. Create helper classes (e.g. `getImageUrl()`) that execute `encodeURI(url)` on the raw string before passing it into `<img src="...">` tags.

### C: Next.js Auth Cookies Silent Dropping
*   **The Problem:** When building the provider-agnostic `MongoAuthRepository`, session tokens were pushed to the client using `cookies().set(..., { secure: true })` inside a Server Action. When testing via an IP address (`http://111.88.251.124`), the browser silently dropped the cookie because `secure=true` mandates an SSL connection, throwing the user into a mysterious continuous login loop.
*   **The Solution:** Dynamically assign `secure: process.env.NODE_ENV === 'production'` or ensure SSL is fully active before enabling strictly secure cookies. 

### D: Next.js Router Race Conditions
*   **The Problem:** Post-authentication forcing `router.push('/admin'); window.location.reload();` causes a race condition. The underlying client-side router transition is canceled by the hard reload, causing the page to refresh on the `/login` route, confusing the user who believes the login failed.
*   **The Solution:** Use `window.location.href = '/admin'` for a hard-redirect to avoid React mounting collisions.

---

## 4. Setting up the Environment
*   **Deploy Git Hook:** `git init --bare /var/repo/project.git`. Add a `post-receive` hook that executes `npm install`, `npm run build`, and `pm2 restart`.
*   **Nginx SSL:** Issue Let's Encrypt certificates directly using `certbot --nginx -d DOMAIN`. Certbot will automatically inject SSL headers (`X-Forwarded-Proto`).
