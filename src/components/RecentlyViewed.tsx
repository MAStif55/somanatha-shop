'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { formatPrice } from '@/utils/currency';

interface RecentlyViewedProps {
    currentProductId: string;
}

export default function RecentlyViewed({ currentProductId }: RecentlyViewedProps) {
    const { locale } = useLanguage();
    const { getProducts } = useRecentlyViewed();

    // Filter out the currently viewed product
    const products = getProducts(currentProductId);

    if (products.length === 0) return null;

    return (
        <section className="w-full mt-16 pt-10 border-t border-[#C9A227]/20">
            <h3 className="text-2xl md:text-3xl font-ornamental text-[#E8D48B] mb-8 text-center">
                {locale === 'ru' ? 'Вы недавно смотрели' : 'Recently Viewed'}
            </h3>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {products.map(product => (
                    <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        className="group flex-shrink-0 w-40 sm:w-48 snap-start"
                    >
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#0D0A0B] border border-[#C9A227]/15 group-hover:border-[#C9A227]/40 transition-all relative mb-3">
                            {product.image ? (
                                <Image
                                    src={product.image}
                                    alt={product.title[locale]}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    sizes="192px"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl text-[#C9A227]/20">
                                    🕉️
                                </div>
                            )}
                        </div>
                        <h4 className="text-sm font-medium text-[#E8D48B] truncate group-hover:text-[#C9A227] transition-colors">
                            {product.title[locale]}
                        </h4>
                        <p className="text-sm text-[#C9A227]/80 font-bold mt-0.5">
                            {formatPrice(product.price)}
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
