import { ProductRepository } from '@/lib/data';
import type { Metadata } from 'next';
import ProductDetailsContent from './ProductDetailsContent';

import { Product, getImageUrl } from '@/types/product';

// Ensure this page is statically generated
export const dynamic = 'force-static';

export async function generateStaticParams() {
    try {
        const products = await ProductRepository.getAll() as Product[];

        // If no products, we can't generate paths. 
        // In a real static export, this might mean no product pages are generated.
        return products.map((product) => ({
            slug: product.slug,
        }));
    } catch (error) {
        console.error("Error generating static params:", error);
        return [];
    }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const product = await ProductRepository.getBySlug(params.slug) as Product | null;

    if (!product) {
        return {
            title: 'Товар не найден | Somanatha',
            description: 'Запрашиваемый товар не найден.',
        };
    }

    // Use Russian as primary (main audience), English as fallback
    const titleRu = product.title?.ru || product.title?.en || 'Ведический артефакт';
    const titleEn = product.title?.en || product.title?.ru || 'Vedic Artifact';
    const descriptionRu = product.description?.ru
        ? product.description.ru.slice(0, 160).replace(/<[^>]*>/g, '').replace(/\n/g, ' ') + '...'
        : `${titleRu} — Сакральные янтры и кавача для вашей духовной практики.`;

    return {
        title: `${titleRu} | Somanatha Store`,
        description: descriptionRu,
        alternates: {
            canonical: `/product/${params.slug}/`,
        },
        openGraph: {
            title: `${titleRu} | Somanatha`,
            description: descriptionRu,
            images: product.images?.[0] ? [getImageUrl(product.images[0])] : [],
        },
    };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
    // Fetch product data for JSON-LD (server-side)
    // We try to fetch it here to generate the JSON-LD script. 
    // The client component will re-fetch or we could pass it down, 
    // but to keep architecture simple for now we just fetch for SEO here.
    const product = await ProductRepository.getBySlug(params.slug) as Product | null;

    let jsonLd = null;
    if (product) {
        const title = product.title?.en || 'Vedic Artifact';
        const description = product.description?.en
            ? product.description.en.replace(/<[^>]*>/g, '')
            : 'Authentic Vedic Artifact';

        jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: title,
            image: product.images || [],
            description: description,
            sku: product.id,
            offers: {
                '@type': 'Offer',
                price: product.basePrice,
                priceCurrency: 'RUB',
                availability: 'https://schema.org/InStock',
            },
        };
    }

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            {/* 
              We pass params to the client component. 
              Ideally we should pass the initial data too to avoid double fetch,
              but sticking to original plan of just adding SEO wrapper. 
            */}
            <ProductDetailsContent />
        </>
    );
}
