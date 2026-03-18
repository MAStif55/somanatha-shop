# Media Optimization Pipeline — Agent Playbook

> **Purpose:** Step-by-step guide for an AI agent to implement a multi-variant media optimization pipeline in a Next.js (static export) + Firebase Storage/Firestore project.
>
> **Outcome:** Images generate 3 WebP variants (full/card/thumb) on upload. Videos generate 2 MP4 variants (720p full / 480p preview). Frontend serves the right variant per context.
>
> **Results achieved:** Homepage payload dropped from **7,500 KB → 300 KB** (96% reduction).

---

## Architecture Overview

```
User uploads image
  └→ Client-side canvas resize (3 variants in parallel)
       ├── full.webp    — 1200px, quality 0.85
       ├── _card.webp   — 600px,  quality 0.82
       └── _thumb.webp  — 300px,  quality 0.75
            └→ Firebase Storage (immutable cache headers)
                 └→ Firestore: { url, cardUrl, thumbUrl }

User uploads video
  └→ FFmpeg WASM encode (2 variants sequentially)
       ├── _full.mp4    — 720p, CRF 24, preset slow
       └── _preview.mp4 — 480p, CRF 30, preset slow
            └→ Firebase Storage (immutable cache headers)
                 └→ Firestore: { videoUrl, videoPreviewUrl }
```

---

## Phase 1: Type System

### 1.1 — Extend `ProductImage` type

Add `cardUrl` and `thumbUrl` optional fields, plus helper functions with fallback chains:

```typescript
// src/types/product.ts

export interface ProductImage {
    url: string;           // Full-resolution (1200px) — always present
    cardUrl?: string;      // Medium variant (600px) for product cards
    thumbUrl?: string;     // Small variant (300px) for thumbnails, cart, etc.
    alt: { en: string; ru: string };
    keywords?: string[];
}

// Helper functions with fallback chains
export function getImageUrl(image: string | ProductImage): string {
    return typeof image === 'string' ? image : image.url;
}

export function getCardImageUrl(image: string | ProductImage): string {
    if (typeof image === 'string') return image;
    return image.cardUrl || image.url;
}

export function getThumbImageUrl(image: string | ProductImage): string {
    if (typeof image === 'string') return image;
    return image.thumbUrl || image.cardUrl || image.url;
}
```

### 1.2 — Extend `Product` type

```typescript
export interface Product {
    // ... existing fields ...
    videoPreviewUrl?: string; // 480p compressed preview for product cards
    videoUrl?: string;        // 720p high-quality video for product detail page
}
```

**IMPORTANT:** Also add `videoUrl` to any server-side Product types (e.g. `ServerProduct` in `firebase-admin.ts`).

---

## Phase 2: Image Upload Pipeline (`ImageUpload.tsx`)

### 2.1 — Define variants

```typescript
const VARIANTS = [
    { suffix: '',       maxDim: 1200, quality: 0.85 },  // full
    { suffix: '_card',  maxDim: 600,  quality: 0.82 },  // card
    { suffix: '_thumb', maxDim: 300,  quality: 0.75 },  // thumb
] as const;
```

### 2.2 — Generate variant function

Uses `<canvas>` to resize and convert to WebP client-side:

```typescript
const generateVariant = async (file: File, maxDim: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        img.onload = () => {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
                if (width >= height) {
                    height = (height * maxDim) / width;
                    width = maxDim;
                } else {
                    width = (width * maxDim) / height;
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            ctx!.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('Blob failed')),
                'image/webp', quality
            );
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = URL.createObjectURL(file);
    });
};
```

### 2.3 — Upload handler

```typescript
const uploadMetadata = {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
};

const handleUpload = async (file: File) => {
    const baseName = `${Date.now()}_${file.name.replace(/\.[^/.]+$/, '')}`;

    // Generate all variants in parallel
    const blobs = await Promise.all(
        VARIANTS.map(v => generateVariant(file, v.maxDim, v.quality))
    );

    // Upload all variants in parallel
    const urls = await Promise.all(
        VARIANTS.map((v, i) => {
            const filename = `${baseName}${v.suffix}.webp`;
            const storageRef = ref(storage, `uploads/${filename}`);
            return uploadBytes(storageRef, blobs[i], uploadMetadata)
                .then(() => getDownloadURL(storageRef));
        })
    );

    const [fullUrl, cardUrl, thumbUrl] = urls;
    const newImage: ProductImage = {
        url: fullUrl,
        cardUrl,
        thumbUrl,
        alt: { en: '', ru: '' },
        keywords: []
    };
    onChange([...normalizedImages, newImage]);
};
```

---

## ⚠️ CRITICAL BUG #1: `normalizedImages` Stripping Variant Fields

**This was the #1 most destructive bug.** If your `ImageUpload` component normalizes image objects for internal state (very common pattern), the normalization function will silently DROP `cardUrl` and `thumbUrl` unless you explicitly preserve them.

```typescript
// ❌ BAD — drops cardUrl, thumbUrl on EVERY re-render
const normalizedImages = value.map(img => {
    if (typeof img === 'string') return { url: img, alt: { en: '', ru: '' } };
    return {
        url: img.url || '',
        alt: img.alt || { en: '', ru: '' },
        keywords: img.keywords || []
    };
});

// ✅ GOOD — spread entire object first, then apply defaults
const normalizedImages = value.map(img => {
    if (typeof img === 'string') return { url: img, alt: { en: '', ru: '' } };
    return {
        ...img,                              // ← PRESERVES cardUrl, thumbUrl
        url: img.url || '',
        alt: img.alt || { en: '', ru: '' },
        keywords: img.keywords || []
    };
});
```

**Symptoms:** Everything appears to work during upload (variants are generated and uploaded). But when the product is saved, `cardUrl` and `thumbUrl` vanish from Firestore. Extremely hard to diagnose because the upload step works perfectly.

---

## Phase 3: Video Upload Pipeline (`VideoUpload.tsx`)

### 3.1 — Dependencies

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util rc-slider
```

### 3.2 — Dual-variant encoding

```typescript
// Preview variant (480p, high compression, for card hover)
await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vf', 'scale=-2:min(480\\,ih)',
    '-c:v', 'libx264', '-crf', '30', '-preset', 'slow',
    '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart',
    '-y', 'preview.mp4'
]);

// Full variant (720p, balanced quality, for PDP gallery)
await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vf', 'scale=-2:min(720\\,ih)',
    '-c:v', 'libx264', '-crf', '24', '-preset', 'slow',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    '-y', 'full.mp4'
]);
```

### 3.3 — Upload both and return

```typescript
const videoMetadata = {
    contentType: 'video/mp4',
    cacheControl: 'public, max-age=31536000, immutable',
};

// Upload preview
const previewRef = ref(storage, `videos/${Date.now()}_preview.mp4`);
await uploadBytes(previewRef, previewData, videoMetadata);
const videoPreviewUrl = await getDownloadURL(previewRef);

// Upload full
const fullRef = ref(storage, `videos/${Date.now()}_full.mp4`);
await uploadBytes(fullRef, fullData, videoMetadata);
const videoUrl = await getDownloadURL(fullRef);

// Return BOTH URLs
onChange({ videoUrl, videoPreviewUrl });
```

---

## ⚠️ CRITICAL BUG #2: `onChange` Signature Mismatch

The `VideoUpload` onChange prop changes from `(url: string) => void` to `(result: { videoUrl: string; videoPreviewUrl: string }) => void`.

**You MUST update ALL call sites**, including the "delete video" handler:

```typescript
// Delete handler:
onChange({ videoUrl: '', videoPreviewUrl: '' });  // ✅ CORRECT
// NOT:
onChange('');  // ❌ Type error — will crash
```

**In `ProductForm.tsx`:**
```typescript
<VideoUpload
    value={formData.videoPreviewUrl}
    onChange={({ videoUrl, videoPreviewUrl }) => {
        setIsDirty(true);
        setFormData(prev => ({ ...prev, videoUrl, videoPreviewUrl }));
    }}
/>
```

Also add `videoUrl: ''` to the initial empty `formData` object.

---

## Phase 4: Frontend Component Integration

### Where to use each variant

| Context | Helper | Variant | Typical Size |
|:---|:---|:---|---:|
| Product card images | `getCardImageUrl(img)` | `_card.webp` | ~75 KB |
| Gallery thumbnails | `getThumbImageUrl(img)` | `_thumb.webp` | ~22 KB |
| Cart item images | `getThumbImageUrl(img)` | `_thumb.webp` | ~22 KB |
| PDP main gallery | `getImageUrl(img)` | Full `.webp` | ~236 KB |
| Card video hover | `product.videoPreviewUrl` | `_preview.mp4` | ~600 KB |
| PDP video player | `product.videoUrl \|\| product.videoPreviewUrl` | `_full.mp4` | ~1.5 MB |

### Files checklist

- [ ] `ProductCard.tsx` → `getCardImageUrl()` for card, `getThumbImageUrl()` for cart
- [ ] `ProductDetailsContent.tsx` → `getThumbImageUrl()` for thumbs, `videoUrl || videoPreviewUrl` for video
- [ ] `AdminProductCard.tsx` → `getCardImageUrl()`
- [ ] `ProductSelector.tsx` → `getThumbImageUrl()`
- [ ] `admin/products/page.tsx` → `getThumbImageUrl()`
- [ ] `ProductForm.tsx` → Updated `VideoUpload` callback (see Bug #2)

---

## ⚠️ CRITICAL BUG #3: Static Export + Missing Firebase Admin Credentials

With `output: 'export'`, the homepage is pre-rendered at build time using the Firebase Admin SDK. If credentials aren't available (`GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_BASE64`), the server-side fetch silently returns `[]`, and the **entire products section disappears** from the homepage.

**Fix: Add a client-side fallback** in the homepage content component:

```typescript
const [products, setProducts] = useState<Product[]>(initialProducts);

useEffect(() => {
    if (initialProducts.length === 0) {
        getNewestProducts<Product>(4).then(setProducts).catch(console.error);
    }
}, [initialProducts]);

// Render using `products` state, NOT `initialProducts` prop
{products.length > 0 && ( /* product grid */ )}
```

---

## ⚠️ BUG #4: Firebase Storage Cache Headers

Even when you set `cacheControl: 'public, max-age=31536000, immutable'` in the upload metadata, Firebase Storage may still serve `private, max-age=0` for some files (especially older uploads or depending on storage rules). The immutable headers only apply to files uploaded WITH the metadata — they don't retroactively apply to existing files.

**Fix:** The migration script must re-upload files with correct metadata, or update storage rules.

---

## Phase 5: Migration Script (for existing products)

Create `scripts/migrate-images.js` using:
- `firebase-admin` — server-side Firestore + Storage access
- `sharp` — image resizing and WebP conversion
- `uuid` — generating unique download tokens

```bash
npm install sharp uuid firebase-admin

# Set credentials
set GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Test with one product
node scripts/migrate-images.js --product-id <id>

# Dry run (preview only)
node scripts/migrate-images.js --dry-run

# Full migration
node scripts/migrate-images.js
```

The script should:
1. Iterate all products in Firestore
2. For each image that lacks `cardUrl`/`thumbUrl`:
   - Download from Firebase Storage
   - Generate card (600px) and thumb (300px) variants with sharp
   - Upload to Storage with immutable cache headers
   - Update Firestore doc with new URLs
3. Skip images that already have variants

---

## Deployment Checklist

```bash
# 1. Type check
npx tsc --noEmit

# 2. Build (generates all static pages)
npm run build

# 3. Deploy to Firebase Hosting
firebase deploy --only hosting

# 4. Verify in browser (clear cache!)
# Check: homepage cards → _card.webp
# Check: PDP thumbs → _thumb.webp
# Check: PDP video → _full.mp4
```

---

## Verification Checklist

After deployment:

- [ ] Homepage card images request `_card.webp` URLs (~50-80 KB each)
- [ ] PDP thumbnails request `_thumb.webp` URLs (~15-25 KB each)
- [ ] PDP main gallery requests full-res `.webp` (~200-300 KB)
- [ ] PDP video loads `_full.mp4` (720p) or falls back to `_preview.mp4`
- [ ] Card video hover loads `_preview.mp4` (480p, ~500-700 KB)
- [ ] Cache headers: `Cache-Control: public, max-age=31536000, immutable`
- [ ] Admin: uploading new image creates 3 files in Storage
- [ ] Admin: re-saving existing product preserves `cardUrl`/`thumbUrl`
- [ ] Firestore docs contain `cardUrl`, `thumbUrl`, `videoUrl`, `videoPreviewUrl`
- [ ] Products without variants still render (fallback chain works)

---

## Expected Results

| Metric | Before | After | Improvement |
|:---|---:|---:|:---:|
| Homepage image payload | ~7,500 KB | ~300 KB | **96% ↓** |
| Thumbnail size | ~250 KB | ~22 KB | **91% ↓** |
| Card image size | ~250 KB | ~75 KB | **70% ↓** |
| Video preview | ~6,500 KB | ~600 KB | **91% ↓** |
| Cache on revisit | Re-download | Immutable 1yr | **∞ ↑** |
