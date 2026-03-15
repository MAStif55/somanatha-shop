# Next.js E-commerce Template

A reusable Next.js + Firebase e-commerce template with cart, authentication, and internationalization.

## Features

| Feature | Description |
|---------|-------------|
| 🔥 **Firebase Integration** | Auth, Firestore, Storage pre-configured |
| 🛒 **Shopping Cart** | Zustand store with localStorage persistence |
| 🌐 **Internationalization** | Russian/English with dictionary-based translations |
| 📱 **Telegram Notifications** | Order notifications via Telegram bot |
| ✅ **Form Validation** | Zod schemas with localized error messages |
| 🖼️ **Image Upload** | Drag-drop with auto-optimization (WebP) |
| 🔐 **Admin Authentication** | Firebase Auth with protected routes |
| ⚠️ **Unsaved Changes Guard** | Hooks for tracking changes + exit confirmation |

## Quick Start

### 1. Copy the Template

```bash
# Copy to your new project folder
cp -r next-ecommerce-template my-new-shop
cd my-new-shop
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password)
3. Create a **Firestore Database**
4. Enable **Storage**
5. Copy your config to `.env.local`:

```bash
# Copy the example and fill in your values
cp .env.local.example .env.local
```

### 4. Deploy Firestore Rules

```bash
npx firebase login
npx firebase deploy --only firestore:rules
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
├── lib/                    # Core utilities
│   ├── firebase.ts         # Firebase initialization
│   ├── firestore-utils.ts  # Database CRUD operations
│   ├── order-service.ts    # Order creation + Telegram
│   └── checkout-schema.ts  # Zod validation
├── store/                  # State management
│   ├── cart-store.ts       # Shopping cart (Zustand)
│   └── product-cache.ts    # Product caching
├── contexts/               # React contexts
│   ├── AuthContext.tsx     # Firebase authentication
│   └── LanguageContext.tsx # i18n support
├── hooks/                  # Custom React hooks
│   └── useUnsavedChanges.ts # Change tracking + navigation guard
├── types/                  # TypeScript definitions
│   ├── product.ts          # Product types
│   └── order.ts            # Order types
├── locales/                # Translation files
│   ├── en.json             # English
│   └── ru.json             # Russian
├── components/
│   └── admin/              # Admin UI components
│       ├── ConfirmModal.tsx
│       └── ImageUpload.tsx
└── utils/                  # Helper functions
    └── currency.ts         # Price formatting
```

---

## Customization Guide

### 1. Product Types

Edit `src/types/product.ts` to match your product structure:

```typescript
export interface Product {
    id: string;
    title: { en: string; ru: string };
    description: { en: string; ru: string };
    basePrice: number;
    images: string[];
    // Add your custom fields
    category?: string;
    inStock?: boolean;
}
```

### 2. Brand Colors

Edit `tailwind.config.ts`:

```typescript
colors: {
    canvas: '#FAF9F6',      // Background
    primary: {
        DEFAULT: '#E67E22', // Your brand color
        light: '#F1C40F',
        dark: '#D35400',
    },
    // ...
}
```

### 3. Translations

Add your text to `src/locales/en.json` and `src/locales/ru.json`:

```json
{
    "product": {
        "addToCart": "Add to Cart",
        "yourCustomKey": "Your custom text"
    }
}
```

Use in components:

```tsx
const { t } = useLanguage();
return <button>{t('product.addToCart')}</button>;
```

### 4. Cart Store Key

Change the localStorage key in `src/store/cart-store.ts`:

```typescript
const STORAGE_KEY = 'your-shop-cart';
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` | Telegram bot token for notifications |
| `NEXT_PUBLIC_TELEGRAM_CHAT_ID` | Telegram chat ID for notifications |

---

## Deployment

### Firebase Hosting

```bash
# Build static export
npm run build

# Deploy
npx firebase deploy --only hosting
```

### Other Platforms

This template uses `output: 'export'` for static hosting. Works with:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting

---

## Usage Examples

### Add to Cart

```tsx
import { useCartStore } from '@/store/cart-store';

function ProductCard({ product }) {
    const addItem = useCartStore((state) => state.addItem);
    
    const handleAddToCart = () => {
        addItem({
            productId: product.id,
            productTitle: product.title,
            productImage: product.images[0],
            price: product.basePrice,
            quantity: 1,
        });
    };
    
    return <button onClick={handleAddToCart}>Add to Cart</button>;
}
```

### Protected Admin Route

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    
    if (loading) return <div>Loading...</div>;
    if (!user) {
        router.push('/admin/login');
        return null;
    }
    
    return <div>Admin Dashboard</div>;
}
```

### Language Switching

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

function LanguageSwitcher() {
    const { locale, setLocale } = useLanguage();
    
    return (
        <div>
            <button onClick={() => setLocale('en')}>EN</button>
            <button onClick={() => setLocale('ru')}>RU</button>
        </div>
    );
}
```

### Unsaved Changes with Exit Confirmation

Use the `useUnsavedChanges` and `useNavigationGuard` hooks with `ConfirmModal` to warn users before leaving a page with unsaved changes:

```tsx
import { useUnsavedChanges, useNavigationGuard } from '@/hooks/useUnsavedChanges';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useRouter } from 'next/navigation';

function EditPage() {
    const router = useRouter();
    const [formData, setFormData] = useState(null);
    
    // Track unsaved changes
    const { setOriginalData, hasChanges, markAsSaved } = useUnsavedChanges();
    
    // Navigation guard
    const { showModal, pendingPath, requestNavigation, confirmNavigation, cancelNavigation } = useNavigationGuard();
    
    // Load initial data
    useEffect(() => {
        const data = await loadData();
        setFormData(data);
        setOriginalData(data); // Store original for comparison
    }, []);
    
    const isDirty = formData && hasChanges(formData);
    
    // Handle back button
    const handleBack = () => {
        if (isDirty) {
            requestNavigation('/admin'); // Show confirmation modal
        } else {
            router.push('/admin');
        }
    };
    
    // Handle save
    const handleSave = async () => {
        await saveData(formData);
        markAsSaved(formData); // Reset dirty state
    };
    
    return (
        <>
            {/* Your form here */}
            <button onClick={handleBack}>← Back</button>
            <button onClick={handleSave} disabled={!isDirty}>
                {isDirty ? 'Save Changes' : 'Saved'}
            </button>
            
            {/* Exit confirmation modal */}
            <ConfirmModal
                isOpen={showModal}
                title="Unsaved Changes"
                message="You have unsaved changes. What would you like to do?"
                confirmLabel="Discard Changes"
                cancelLabel="Cancel"
                saveLabel="Save & Exit"
                variant="warning"
                onConfirm={() => {
                    confirmNavigation();
                    router.push(pendingPath!);
                }}
                onCancel={cancelNavigation}
                onSave={async () => {
                    await handleSave();
                    confirmNavigation();
                    router.push(pendingPath!);
                }}
            />
        </>
    );
}
```

---

## License

MIT - Feel free to use for personal and commercial projects.

