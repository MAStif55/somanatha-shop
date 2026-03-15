import { getNewestProductsServer } from '@/lib/firebase-admin';
import HomePageContent from '@/components/HomePageContent';
import { Product } from '@/types/product';

/**
 * Homepage — Server Component
 * 
 * Fetches newest products from Firestore at build time (static export).
 * Data is baked into the HTML — no client-side loading spinner.
 * All interactive UI lives in HomePageContent (client component).
 */
export default async function HomePage() {
    const products = await getNewestProductsServer(4);

    return <HomePageContent initialProducts={products as Product[]} />;
}
