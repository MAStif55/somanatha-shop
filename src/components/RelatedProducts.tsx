'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Product } from '@/types/product';
import { getAllProducts } from '@/lib/firestore-utils';
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
                // In a real app, we'd query by category limit 4. 
                // For now, fetching all and filtering client side for simplicity given small dataset.
                const all = await getAllProducts<Product>();
                const filtered = all
                    .filter(p => p.id !== currentProductId && p.category === category)
                    .slice(0, 4);

                // Fallback: if no related in category, show random others
                if (filtered.length === 0) {
                    const random = all
                        .filter(p => p.id !== currentProductId)
                        .slice(0, 4);
                    setRelated(random);
                } else {
                    setRelated(filtered);
                }
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
