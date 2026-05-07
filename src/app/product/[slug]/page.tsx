import { ProductRepository } from '@/lib/data';
import type { Metadata } from 'next';
import ProductDetailsContent from './ProductDetailsContent';
import JsonLd from '@/components/JsonLd';

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
    const product = await ProductRepository.getBySlug(params.slug) as Product | null;

    const BASE_URL = 'https://somanatha.ru';

    let productJsonLd = null;
    let breadcrumbJsonLd = null;

    if (product) {
        const titleRu = product.title?.ru || 'Ведический артефакт';
        const titleEn = product.title?.en || titleRu;
        const descriptionRu = product.description?.ru
            ? product.description.ru.replace(/<[^>]*>/g, '').replace(/\n/g, ' ').slice(0, 300)
            : `${titleRu} — сакральный предмет для духовной практики.`;
        const descriptionEn = product.description?.en
            ? product.description.en.replace(/<[^>]*>/g, '').replace(/\n/g, ' ').slice(0, 300)
            : descriptionRu;

        // Full absolute image URLs
        const imageUrls = (product.images || []).map((img: any) => {
            const url = getImageUrl(img);
            return url.startsWith('http') ? url : `${BASE_URL}${url}`;
        });

        const productUrl = `${BASE_URL}/product/${params.slug}`;

        productJsonLd = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: titleRu,
            description: descriptionRu,
            image: imageUrls,
            sku: product.id,
            url: productUrl,
            brand: {
                '@type': 'Brand',
                name: 'Somanatha',
            },
            offers: {
                '@type': 'Offer',
                url: productUrl,
                price: Number(product.basePrice) || 0,
                priceCurrency: 'RUB',
                availability: 'https://schema.org/InStock',
                seller: {
                    '@type': 'Organization',
                    name: 'Somanatha',
                    url: BASE_URL,
                },
            },
        };

        // Category translation for breadcrumbs
        const categoryLabels: Record<string, string> = {
            'yantras': 'Янтры',
            'kavacha': 'Кавача',
        };
        const categoryLabel = categoryLabels[product.category || ''] || product.category || '';

        breadcrumbJsonLd = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Главная',
                    item: BASE_URL,
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Каталог',
                    item: `${BASE_URL}/catalog`,
                },
                ...(product.category ? [{
                    '@type': 'ListItem',
                    position: 3,
                    name: categoryLabel,
                    item: `${BASE_URL}/catalog/${product.category}`,
                }] : []),
                {
                    '@type': 'ListItem',
                    position: product.category ? 4 : 3,
                    name: titleRu,
                    item: productUrl,
                },
            ],
        };
    }

    return (
        <>
            {product && (
                <>
                    <JsonLd schema={productJsonLd} />
                    <JsonLd schema={breadcrumbJsonLd} />
                </>
            )}
            <ProductDetailsContent />
        </>
    );
}
