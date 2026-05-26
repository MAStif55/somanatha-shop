import HomePageContent from '@/components/HomePageContent';
import { Product } from '@/types/product';
import { ProductRepository } from '@/lib/data';

/**
 * Homepage — Server Component
 * 
 * Fetches newest products from the provider at build/request time.
 * Data is baked into the HTML — no client-side loading spinner.
 * All interactive UI lives in HomePageContent (client component).
 */
export default async function HomePage() {
    let products: Product[] = [];
    try {
        products = await ProductRepository.getNewest(4) as Product[];
    } catch (e) {
        console.warn('Failed to fetch newest products during build/render. Check MongoDB connection.');
    }

    return <HomePageContent initialProducts={products} />;
}
