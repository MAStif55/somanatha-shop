import { ProductRepository } from '@/lib/data';
import { MetadataRoute } from 'next';

import { Product } from '@/types/product';
import { CATEGORIES } from '@/types/category';

const BASE_URL = 'https://somanatha.ru';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const products = await ProductRepository.getAll() as Product[];

    // Deduplicate products by slug to prevent duplicate sitemap entries
    const seenSlugs = new Set<string>();
    const uniqueProducts = products.filter((product) => {
        if (seenSlugs.has(product.slug)) return false;
        seenSlugs.add(product.slug);
        return true;
    });

    const productUrls = uniqueProducts.map((product) => ({
        url: `${BASE_URL}/product/${product.slug}/`,
        lastModified: new Date(), // Ideally this would come from the product updated_at
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    const categoryUrls = CATEGORIES.map((cat) => ({
        url: `${BASE_URL}/catalog/${cat.slug}/`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
    }));

    return [
        {
            url: `${BASE_URL}/`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${BASE_URL}/catalog/`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/about/`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/contact/`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/shipping/`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/faq/`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        ...categoryUrls,
        ...productUrls,
    ];
}
