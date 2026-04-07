'use client';

import { ProductRepository, CategoryRepository } from '@/lib/data';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CATEGORIES, getCategoryBySlug, CategorySlug, SubCategory } from '@/types/category';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

import { Product } from '@/types/product';
import ProductCard from '@/components/ProductCard';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { useProductStore } from '@/store/product-store';

interface CategoryPageContentProps {
    categorySlug: CategorySlug;
}

import { Search, X } from 'lucide-react';

// ... (existing imports)

export default function CategoryPageContent({ categorySlug }: CategoryPageContentProps) {
    const { locale, t } = useLanguage();
    const category = getCategoryBySlug(categorySlug);

    // Global Store
    const { products: allProducts, isLoading: isProductsLoading, hasHydrated, fetchProducts } = useProductStore();

    // Local state for subcategories
    const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
    const [subcatsLoading, setSubcatsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter products for this category
    const products = allProducts.filter(p => p.category === categorySlug);

    // Initial fetch of products (if needed) and subcategories
    useEffect(() => {
        fetchProducts();

        async function loadSubcats() {
            setSubcatsLoading(true);
            try {
                const data = await CategoryRepository.getSubcategories(categorySlug) as SubCategory[];
                setSubcategories(data);
            } catch (error) {
                console.error("Error loading subcategories:", error);
            } finally {
                setSubcatsLoading(false);
            }
        }
        loadSubcats();
    }, [categorySlug, fetchProducts]);

    // Restore scroll position - ready when products are loaded AND store is hydrated
    const shouldBeVisible = useScrollRestore(!isProductsLoading && hasHydrated);

    if (!category) {
        // ... (existing 404 block)
        return (
            <main className="min-h-screen bg-[#FAF9F6]">
                {/* ... existing 404 content */}
                <Header />
                <div className="flex-1 flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🤔</div>
                        <h1 className="text-2xl font-bold text-[#5D2E0C] mb-4">
                            {locale === 'ru' ? 'Категория не найдена' : 'Category not found'}
                        </h1>
                        <Link href="/catalog" className="text-[#8B4513] hover:underline inline-flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                            </svg>
                            {locale === 'ru' ? 'Вернуться в каталог' : 'Back to catalog'}
                        </Link>
                    </div>
                </div>
                <Footer />
            </main>
        );
    }

    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    // Extract unique tags from fetched products
    const availableTags = products.reduce((acc, product) => {
        if (product.tags) {
            product.tags.forEach(tag => acc.add(tag));
        }
        return acc;
    }, new Set<string>());

    const sortedTags = Array.from(availableTags).sort();

    // Filter products by selected tags (AND Logic) and Search Query
    const filteredProducts = products.filter(product => {
        // 1. Filter by Subcategory
        if (selectedSubcategory && product.subcategory !== selectedSubcategory) {
            return false;
        }

        // 2. Filter by Tags (AND Logic)
        if (selectedTags.length > 0) {
            const hasAllTags = product.tags && selectedTags.every(tag => product.tags!.includes(tag));
            if (!hasAllTags) return false;
        }

        // 2. Filter by Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();

            // Search in title (both languages)
            const titleRu = product.title.ru?.toLowerCase() || '';
            const titleEn = product.title.en?.toLowerCase() || '';

            // Search in description (both languages)
            const descRu = product.description?.ru?.toLowerCase() || '';
            const descEn = product.description?.en?.toLowerCase() || '';

            // Search in short description if available
            const shortDescRu = product.shortDescription?.ru?.toLowerCase() || '';
            const shortDescEn = product.shortDescription?.en?.toLowerCase() || '';

            const matchesSearch = (
                titleRu.includes(query) ||
                titleEn.includes(query) ||
                descRu.includes(query) ||
                descEn.includes(query) ||
                shortDescRu.includes(query) ||
                shortDescEn.includes(query)
            );

            if (!matchesSearch) return false;
        }

        return true;
    });

    return (
        <main
            className={`min-h-screen bg-gradient-to-b from-[#2D1B1F] to-[#1A1517] flex flex-col transition-opacity duration-300 ${shouldBeVisible ? 'opacity-100' : 'opacity-0'}`}
        >
            <Header />

            {/* Hero Banner */}
            <section className="py-6 sm:py-8 px-4 sm:px-6 text-center relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-hero-premium opacity-50 z-0"></div>
                {/* Subtle Om background symbol */}
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-[#C9A227] z-0"
                    style={{
                        fontSize: '18rem',
                        fontFamily: 'serif',
                        opacity: 0.1,
                        filter: 'blur(1px) drop-shadow(0 0 20px rgba(201,162,39,0.3))',
                        mixBlendMode: 'overlay'
                    }}
                >
                    ॐ
                </div>
                <div className="relative z-10">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-ornamental text-[#E8D48B] text-glow-gold mb-2">
                        {category.title[locale]}
                    </h2>
                    <p className="text-base sm:text-lg text-[#F5ECD7]/80 max-w-2xl mx-auto font-elegant italic px-2">
                        {category.description[locale]}
                    </p>
                </div>
            </section>

            {/* Catalog Content */}
            <section className="relative flex-1 w-full bg-[#1A1517] bg-sacred-pattern">
                {/* Gradient Mask for top edge */}
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#2D1B1F] to-transparent pointer-events-none z-0"></div>

                <div className="py-6 sm:py-8 px-4 sm:px-6 max-w-6xl mx-auto relative z-10">
                    {/* Breadcrumb */}
                    <nav className="mb-4 text-sm text-[#F5ECD7]/60">
                        <Link href="/" className="hover:text-[#C9A227] transition-colors">{t('nav.home')}</Link>
                        {' / '}
                        <Link href="/catalog" className="hover:text-[#C9A227] transition-colors">{t('nav.catalog')}</Link>
                        {' / '}
                        <span className="text-[#C9A227] font-medium">{category.title[locale]}</span>
                    </nav>

                    {/* Search Bar */}
                    <div className="mb-6 max-w-md mx-auto">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={locale === 'ru' ? 'Поиск в этой категории...' : 'Search in this category...'}
                                className="w-full px-4 sm:px-5 py-3 pl-10 sm:pl-12 pr-10 rounded-xl 
                                         bg-[#0D0A0B]/80 border border-[#C9A227]/30 
                                         text-[#F5ECD7] placeholder-[#F5ECD7]/40
                                         focus:outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20
                                         transition-all text-sm"
                            />
                            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9A227]/60" />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[#C9A227]/20 transition-colors"
                                >
                                    <X className="w-4 h-4 text-[#F5ECD7]/60" />
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <p className="text-center text-xs text-[#F5ECD7]/50 mt-2">
                                {locale === 'ru'
                                    ? `Найдено: ${filteredProducts.length} товар(ов)`
                                    : `Found: ${filteredProducts.length} product(s)`}
                            </p>
                        )}
                    </div>

                    {/* Category Filter - Matching main catalog style */}
                    <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center scrollbar-hide flex-nowrap">
                        <Link
                            href="/catalog"
                            className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-[#C9A227]/30 text-[#E8D48B] font-semibold hover:border-[#C9A227] hover:bg-[#C9A227]/10 transition-all uppercase tracking-wider text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                        >
                            {t('categories.all')}
                        </Link>
                        {CATEGORIES.map((cat) => (
                            <Link
                                key={cat.slug}
                                href={`/catalog/${cat.slug}`}
                                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${cat.slug === categorySlug
                                    ? 'bg-gradient-to-r from-[#C9A227] to-[#8B6914] text-[#0D0A0B] font-bold border border-[#C9A227] shadow-[0_0_15px_rgba(201,162,39,0.3)]'
                                    : 'border border-[#C9A227]/30 text-[#E8D48B] hover:border-[#C9A227] hover:bg-[#C9A227]/10'
                                    }`}
                            >
                                <span className="text-lg sm:text-xl">{cat.icon}</span> {cat.title[locale]}
                            </Link>
                        ))}
                    </div>

                    {/* Subcategories Filter - Only if current category has them */}
                    {subcategories.length > 0 && (
                        <div className="flex gap-2 sm:gap-3 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center scrollbar-hide flex-nowrap">
                            <button
                                onClick={() => setSelectedSubcategory(null)}
                                className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg border font-medium transition-all text-sm whitespace-nowrap flex-shrink-0 ${!selectedSubcategory
                                    ? 'bg-[#C9A227] text-[#0D0A0B] border-[#C9A227]'
                                    : 'border-[#C9A227]/30 text-[#E8D48B] hover:border-[#C9A227] hover:bg-[#C9A227]/10'
                                    }`}
                            >
                                {t('categories.all')}
                            </button>
                            {subcategories.map((sub) => (
                                <button
                                    key={sub.slug}
                                    onClick={() => setSelectedSubcategory(sub.slug === selectedSubcategory ? null : sub.slug)}
                                    className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg border font-medium transition-all text-sm whitespace-nowrap flex-shrink-0 ${selectedSubcategory === sub.slug
                                        ? 'bg-[#C9A227] text-[#0D0A0B] border-[#C9A227] shadow-[0_0_10px_rgba(201,162,39,0.3)]'
                                        : 'border-[#C9A227]/30 text-[#E8D48B] hover:border-[#C9A227] hover:bg-[#C9A227]/10'
                                        }`}
                                >
                                    {sub.title[locale]}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tag Filter */}
                    {sortedTags.length > 0 && (
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
                            {sortedTags.map(tag => (
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
                    {isProductsLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                <div key={n} className="bg-[#2D1B1F] rounded-xl aspect-[3/4] animate-pulse"></div>
                            ))}
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
                            <div className="text-6xl mb-4 opacity-50">{category.icon}</div>
                            <p className="text-xl text-[#F5ECD7]/60 mb-4 font-elegant">
                                {locale === 'ru'
                                    ? 'Товары не найдены'
                                    : 'No products found'}
                            </p>
                            <button
                                onClick={() => {
                                    setSelectedTags([]);
                                    setSelectedSubcategory(null);
                                }}
                                className="text-[#C9A227] hover:underline"
                            >
                                {locale === 'ru' ? 'Сбросить фильтры' : 'Reset filters'}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <Footer />
        </main>
    );
}
