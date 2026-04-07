'use client';

import { ProductRepository } from '@/lib/data';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { CATEGORIES } from '@/types/category';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';

import { Product } from '@/types/product';
import { useProductStore } from '@/store/product-store';
import { Search, X } from 'lucide-react';
import { useScrollRestore } from '@/hooks/useScrollRestore';

export default function CatalogPage() {
    const { locale, t } = useLanguage();
    const { products, isLoading, hasHydrated, fetchProducts } = useProductStore();
    const [searchQuery, setSearchQuery] = useState('');

    // Restore scroll position - only if NOT loading AND hydrated
    // This ensures we don't try to scroll on an empty (pre-hydrated) page
    const shouldBeVisible = useScrollRestore(!isLoading && hasHydrated);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    // Filter products based on search query (partial and complete word matching)
    const filteredProducts = useMemo(() => {
        let result = products;

        // 1. Filter by Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter((product) => {
                // Search in title (both languages)
                const titleRu = product.title.ru?.toLowerCase() || '';
                const titleEn = product.title.en?.toLowerCase() || '';

                // Search in description (both languages)
                const descRu = product.description?.ru?.toLowerCase() || '';
                const descEn = product.description?.en?.toLowerCase() || '';

                // Search in short description if available
                const shortDescRu = product.shortDescription?.ru?.toLowerCase() || '';
                const shortDescEn = product.shortDescription?.en?.toLowerCase() || '';

                // Check if any field contains the query (partial matching)
                return (
                    titleRu.includes(query) ||
                    titleEn.includes(query) ||
                    descRu.includes(query) ||
                    descEn.includes(query) ||
                    shortDescRu.includes(query) ||
                    shortDescEn.includes(query)
                );
            });
        }

        // 2. Filter by Tags (AND Logic)
        if (selectedTags.length > 0) {
            result = result.filter(product =>
                product.tags && selectedTags.every(tag => product.tags!.includes(tag))
            );
        }

        return result;
    }, [products, searchQuery, selectedTags]);

    // Extract unique tags from ALL products (to allow discovery)
    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        products.forEach(p => {
            if (p.tags) {
                p.tags.forEach(tag => tags.add(tag));
            }
        });
        return Array.from(tags).sort();
    }, [products]);

    return (
        <main
            className={`min-h-screen bg-gradient-to-b from-[#2D1B1F] to-[#1A1517] flex flex-col transition-opacity duration-300 ${shouldBeVisible ? 'opacity-100' : 'opacity-0'}`}
        >
            <Header />
            <section className="relative z-10 py-8 text-center"> {/* Added section wrapper for title/description */}
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-ornamental text-[#E8D48B] text-glow-gold mb-2">
                    {t('nav.catalog')}
                </h2>
                <p className="text-base sm:text-lg text-[#F5ECD7]/80 max-w-2xl mx-auto font-elegant italic px-2">
                    {locale === 'ru'
                        ? 'Откройте для себя нашу коллекцию священных артефактов'
                        : 'Discover our collection of sacred artifacts'}
                </p>
            </section>

            {/* Catalog Content */}
            <section className="relative flex-1 w-full bg-[#1A1517] bg-sacred-pattern">
                {/* Gradient Mask for top edge of pattern */}
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#2D1B1F] to-transparent pointer-events-none z-0"></div>

                <div className="py-6 sm:py-8 px-4 sm:px-6 max-w-6xl mx-auto relative z-10">
                    {/* Search Bar */}
                    <div className="mb-4 sm:mb-6">
                        <div className="relative max-w-md mx-auto">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={locale === 'ru' ? 'Поиск товаров...' : 'Search products...'}
                                className="w-full px-4 sm:px-5 py-3 sm:py-4 pl-12 sm:pl-14 pr-10 rounded-xl 
                                         bg-[#0D0A0B]/80 border border-[#C9A227]/30 
                                         text-[#F5ECD7] placeholder-[#F5ECD7]/40
                                         focus:outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20
                                         transition-all text-sm sm:text-base"
                            />
                            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A227]/60" />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[#C9A227]/20 transition-colors"
                                >
                                    <X className="w-4 h-4 text-[#F5ECD7]/60" />
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <p className="text-center text-sm text-[#F5ECD7]/50 mt-3">
                                {locale === 'ru'
                                    ? `Найдено: ${filteredProducts.length} товар(ов)`
                                    : `Found: ${filteredProducts.length} product(s)`}
                            </p>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center scrollbar-hide flex-nowrap">
                        <Link
                            href="/catalog"
                            className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-gradient-to-r from-[#C9A227] to-[#8B6914] text-[#0D0A0B] font-bold border border-[#C9A227] shadow-[0_0_15px_rgba(201,162,39,0.3)] hover:shadow-[0_0_25px_rgba(201,162,39,0.5)] transition-all uppercase tracking-wider text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                        >
                            {t('categories.all')}
                        </Link>
                        {CATEGORIES.map((category) => (
                            <Link
                                key={category.slug}
                                href={`/catalog/${category.slug}`}
                                className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-[#C9A227]/30 text-[#E8D48B] font-semibold hover:border-[#C9A227] hover:bg-[#C9A227]/10 transition-all uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                            >
                                <span className="text-lg sm:text-xl">{category.icon}</span> {category.title[locale]}
                            </Link>
                        ))}
                    </div>

                    {/* Tag Filter */}
                    {availableTags.length > 0 && (
                        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide flex-nowrap sm:flex-wrap sm:justify-center -mx-4 px-4 sm:mx-0 sm:px-0">
                            <button
                                onClick={() => setSelectedTags([])}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${selectedTags.length === 0
                                    ? 'bg-[#C9A227] text-[#0D0A0B] border-[#C9A227]'
                                    : 'bg-transparent text-[#E8D48B] border-[#C9A227]/30 hover:border-[#C9A227]'
                                    }`}
                            >
                                {t('categories.all')}
                            </button>
                            {availableTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap ${selectedTags.includes(tag)
                                        ? 'bg-[#C9A227] text-[#0D0A0B] border-[#C9A227] shadow-[0_0_10px_rgba(201,162,39,0.3)]'
                                        : 'bg-transparent text-[#E8D48B]/80 border-[#C9A227]/20 hover:border-[#C9A227]/50 hover:text-[#E8D48B]'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Products Grid */}
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-12 h-12 border-4 border-[#C9A227]/30 border-t-[#C9A227] rounded-full animate-spin"></div>
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                            {filteredProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : searchQuery ? (
                        <div className="text-center py-16 bg-[#1A1517] border border-[#C9A227]/20 rounded-2xl shadow-lg">
                            <div className="text-6xl mb-4 opacity-50">🔍</div>
                            <p className="text-xl text-[#F5ECD7]/60 mb-4 font-elegant">
                                {locale === 'ru'
                                    ? 'Ничего не найдено'
                                    : 'No results found'}
                            </p>
                            <p className="text-[#F5ECD7]/40 mb-6">
                                {locale === 'ru'
                                    ? `Попробуйте изменить поисковый запрос "${searchQuery}"`
                                    : `Try a different search term for "${searchQuery}"`}
                            </p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-[#C9A227] hover:text-[#E8D48B] underline transition-colors"
                            >
                                {locale === 'ru' ? 'Сбросить поиск' : 'Clear search'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-[#1A1517] border border-[#C9A227]/20 rounded-2xl shadow-lg">
                            <div className="text-6xl mb-4 opacity-50">🕉️</div>
                            <p className="text-xl text-[#F5ECD7]/60 mb-4 font-elegant">
                                {locale === 'ru'
                                    ? 'Товары с выбранными тегами не найдены'
                                    : 'No products found with selected tags'}
                            </p>
                            <button
                                onClick={() => setSelectedTags([])}
                                className="text-[#C9A227] hover:underline"
                            >
                                {locale === 'ru' ? 'Сбросить фильтры' : 'Reset filters'}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <Footer />
        </main >
    );
}
