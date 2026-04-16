'use client';

import { getAllProducts } from '@/actions/admin-actions';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Product } from '@/types/product';

import ProductCard from '@/components/ProductCard';

interface RelatedProductsProps {
    currentProductId: string;
    category: string;
}

export default function RelatedProducts({ currentProductId, category }: RelatedProductsProps) {
    const { locale } = useLanguage();
    const [related, setRelated] = useState<Product[]>([]);

    useEffect(() => {
        const fetchRelated = async () => {
            try {
                const all = await getAllProducts() as Product[];
                const others = all.filter(p => p.id !== currentProductId);

                // Get products from the same category
                const sameCategory = others.filter(p => p.category === category);

                // Shuffle helper
                const shuffle = <T,>(arr: T[]): T[] => {
                    const a = [...arr];
                    for (let i = a.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [a[i], a[j]] = [a[j], a[i]];
                    }
                    return a;
                };

                let result = shuffle(sameCategory).slice(0, 4);

                // If fewer than 4, fill from other categories
                if (result.length < 4) {
                    const remaining = 4 - result.length;
                    const resultIds = new Set(result.map(p => p.id));
                    const otherCategories = others.filter(p => p.category !== category && !resultIds.has(p.id));
                    result = [...result, ...shuffle(otherCategories).slice(0, remaining)];
                }

                setRelated(result);
            } catch (error) {
                console.error("Error fetching related:", error);
            }
        };
        fetchRelated();
    }, [currentProductId, category]);

    if (related.length === 0) return null;

    return (
        <section className="w-full mt-20 pt-10 border-t border-[#C9A227]/20">
            <h3 className="text-2xl md:text-3xl font-ornamental text-[#E8D48B] mb-8 text-center">
                {locale === 'ru' ? 'Вам также может понравиться' : 'You Might Also Like'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {related.map(p => (
                    <ProductCard key={p.id} product={p} />
                ))}
            </div>
        </section>
    );
}
