'use client';

import { ProductRepository, CategoryRepository } from '@/lib/data';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Product, getImageUrl, getThumbImageUrl, getImageAlt } from '@/types/product';
import { VariationGroup } from '@/types/product';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { formatPrice } from '@/utils/currency';
import { ShoppingCart, Check } from 'lucide-react';


import { useCartStore } from '@/store/cart-store';
import VariationSelector from '@/components/VariationSelector';
import { SelectedVariation } from '@/types/order';
import RelatedProducts from '@/components/RelatedProducts';
import Markdown from 'react-markdown';

function ProductContent() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    // Extract slug from URL path (/product/xxx/) or query params (?slug=xxx)
    let slug: string | null = searchParams.get('slug');
    if (!slug && pathname) {
        const match = pathname.match(/\/product\/([^\/]+)/);
        if (match) {
            slug = match[1];
        }
    }

    const { locale, t } = useLanguage();
    const addToCart = useCartStore((state) => state.addItem);
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
    const [variationDetails, setVariationDetails] = useState<SelectedVariation[]>([]);
    const [effectiveVariations, setEffectiveVariations] = useState<VariationGroup[]>([]);
    const [addedToCart, setAddedToCart] = useState(false);

    useEffect(() => {
        if (!slug) {
            setLoading(false);
            return;
        }

        async function loadProduct() {
            setLoading(true);
            try {
                // First try by slug
                let data = await ProductRepository.getBySlug(slug as string) as Product | null;

                // If not found by slug, try by ID (fallback for products without slugs)
                if (!data) {
                    data = await ProductRepository.getById(slug as string) as Product | null;
                }

                setProduct(data);

                // Determine effective variations (category defaults vs custom)
                let variations: VariationGroup[] = [];

                if (data?.variationOverrides?.useDefaults !== false && data?.category) {
                    // Use category defaults, filter out disabled options
                    const categoryVars = await CategoryRepository.getVariations(data.category);
                    const disabledOptions = data.variationOverrides?.disabledOptions || [];

                    variations = categoryVars.map(group => ({
                        ...group,
                        options: group.options.filter(opt => !disabledOptions.includes(opt.id))
                    })).filter(group => group.options.length > 0);
                } else if (data?.variations) {
                    // Use custom variations
                    variations = data.variations;
                }

                setEffectiveVariations(variations);

                // Initialize default selections (first option of each group)
                if (variations.length > 0) {
                    const defaultSelections: Record<string, string> = {};
                    const defaultDetails: SelectedVariation[] = [];

                    variations.forEach(group => {
                        if (group.options.length > 0) {
                            const firstOption = group.options[0];
                            defaultSelections[group.id] = firstOption.id;
                            defaultDetails.push({
                                groupId: group.id,
                                groupName: group.name[locale] || group.name.ru,
                                optionId: firstOption.id,
                                optionLabel: firstOption.label[locale] || firstOption.label.ru,
                                priceModifier: firstOption.priceModifier,
                            });
                        }
                    });

                    setSelectedVariations(defaultSelections);
                    setVariationDetails(defaultDetails);
                }
            } catch (error) {
                console.error("Error loading product:", error);
            } finally {
                setLoading(false);
            }
        }
        loadProduct();
    }, [slug, locale]);

    // Calculate total price including variations
    const totalPriceModifier = variationDetails.reduce((sum, v) => sum + v.priceModifier, 0);
    const totalPrice = (product?.basePrice || 0) + totalPriceModifier;

    const handleAddToCart = () => {
        if (!product) return;

        // Build configuration from selected variations
        const configuration: Record<string, string> = {};
        variationDetails.forEach(v => {
            configuration[v.groupName] = v.optionLabel;
        });

        addToCart({
            productId: product.id,
            productTitle: product.title,
            productImage: product.images?.[0] ? getThumbImageUrl(product.images[0]) : '',
            configuration,
            price: totalPrice,
            quantity: 1,
        });

        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-b from-[#2D1B1F] to-[#1A1517] flex flex-col">
                <Header />
                <div className="flex-1 w-full bg-sacred-pattern relative">
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#2D1B1F] to-transparent pointer-events-none z-0"></div>
                    <div className="max-w-7xl mx-auto px-6 py-8 relative z-10 animate-pulse">
                        {/* Breadcrumbs skeleton */}
                        <div className="h-4 w-48 bg-[#3D2B2F] rounded mb-8"></div>

                        <div className="grid lg:grid-cols-2 gap-12 items-start">
                            {/* Image skeleton */}
                            <div className="space-y-4">
                                <div className="aspect-square bg-[#3D2B2F] rounded-2xl"></div>
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 bg-[#3D2B2F] rounded-lg"></div>
                                    <div className="w-20 h-20 bg-[#3D2B2F] rounded-lg"></div>
                                    <div className="w-20 h-20 bg-[#3D2B2F] rounded-lg"></div>
                                </div>
                            </div>

                            {/* Content skeleton */}
                            <div className="space-y-6">
                                <div className="h-4 w-20 bg-[#C9A227]/30 rounded"></div>
                                <div className="h-12 w-3/4 bg-[#3D2B2F] rounded"></div>
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-32 bg-[#3D2B2F] rounded"></div>
                                    <div className="h-6 w-24 bg-[#2E7D32]/30 rounded-full"></div>
                                </div>
                                <div className="space-y-3 pt-4">
                                    <div className="h-4 w-full bg-[#3D2B2F] rounded"></div>
                                    <div className="h-4 w-5/6 bg-[#3D2B2F] rounded"></div>
                                    <div className="h-4 w-4/5 bg-[#3D2B2F] rounded"></div>
                                    <div className="h-4 w-full bg-[#3D2B2F] rounded"></div>
                                </div>
                                <div className="h-14 w-full bg-[#C9A227]/30 rounded-xl mt-8"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </main>
        );
    }

    if (!product) {
        return (
            <main className="min-h-screen bg-gradient-to-b from-[#2D1B1F] to-[#1A1517] flex flex-col">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center py-32 text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h1 className="text-2xl font-bold text-[#E8D48B] mb-4">
                        {locale === 'ru' ? 'Товар не найден' : 'Product not found'}
                    </h1>
                    <Link href="/catalog" className="text-[#C9A227] hover:underline font-medium">
                        {locale === 'ru' ? 'Вернуться в каталог' : 'Return to Catalog'}
                    </Link>
                </div>
                <Footer />
            </main>
        );
    }

    // Category translation helper
    const categoryLabels: { [key: string]: { en: string; ru: string } } = {
        'yantras': { en: 'Yantras', ru: 'Янтры' },
        'kavacha': { en: 'Kavacha', ru: 'Кавача' },
    };
    const currentLocale = (locale || 'ru') as 'en' | 'ru';
    const category = product.category || '';
    const categoryLabel = categoryLabels[category]?.[currentLocale] || category;

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#2D1B1F] to-[#1A1517] flex flex-col">
            <Header />

            <div className="flex-1 w-full bg-sacred-pattern relative">
                {/* Gradient Mask for top edge */}
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#2D1B1F] to-transparent pointer-events-none z-0"></div>

                <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-sm text-[#F5ECD7]/60 mb-8 overflow-x-auto whitespace-nowrap pb-2">
                        <Link href="/" className="hover:text-[#C9A227] transition-colors">{t('nav.home')}</Link>
                        <span className="text-[#F5ECD7]/30">/</span>
                        <Link href="/catalog" className="hover:text-[#C9A227] transition-colors">{t('nav.catalog')}</Link>
                        <span className="text-[#F5ECD7]/30">/</span>
                        <Link href={`/catalog/${product.category}`} className="hover:text-[#C9A227] text-xs font-bold tracking-wider">{categoryLabel}</Link>
                        <span className="text-[#F5ECD7]/30">/</span>
                        <span className="text-[#C9A227] font-medium truncate max-w-[200px]">{product.title[locale]}</span>
                    </nav>

                    <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
                        {/* Left: Images */}
                        <div className="space-y-4">
                            <div
                                className="aspect-square bg-[#0D0A0B] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-[#C9A227]/20 relative group product-image-container"
                                onContextMenu={(e) => e.preventDefault()}
                            >
                                {product.images && product.images.length > 0 ? (
                                    <Image
                                        src={getImageUrl(product.images[selectedImage])}
                                        alt={getImageAlt(product.images[selectedImage], locale as 'en' | 'ru', product.title[locale])}
                                        fill
                                        priority
                                        draggable={false}
                                        className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        onDragStart={(e) => e.preventDefault()}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-6xl bg-[#1A1517] text-[#C9A227]/20">
                                        🕉️
                                    </div>
                                )}
                            </div>

                            {/* Thumbnails */}
                            {product.images && product.images.length > 1 && (
                                <div className="flex gap-4 overflow-x-auto p-2 scrollbar-hide">
                                    {product.images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImage(idx)}
                                            onContextMenu={(e) => e.preventDefault()}
                                            className={`relative w-20 h-20 rounded-lg overflow-hidden transition-all flex-shrink-0 product-image-container ${selectedImage === idx ? 'shadow-[0_0_15px_rgba(201,162,39,0.3)] scale-105 z-10' : 'opacity-60 hover:opacity-100'
                                                }`}
                                        >
                                            <Image
                                                src={getThumbImageUrl(img)}
                                                alt={getImageAlt(img, locale as 'en' | 'ru', '')}
                                                fill
                                                draggable={false}
                                                className="object-cover"
                                                sizes="80px"
                                                onDragStart={(e) => e.preventDefault()}
                                            />
                                            {/* Selection Frame Overlay */}
                                            <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${selectedImage === idx ? 'border-[#C9A227]' : 'border-[#C9A227]/20'
                                                }`} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: Info */}
                        <div className="flex flex-col">
                            <div className="mb-2">
                                <span className="text-[#C9A227] font-bold text-xs uppercase tracking-[0.2em] opacity-80">
                                    {categoryLabel}
                                </span>
                            </div>

                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#E8D48B] text-glow-gold mb-6 font-ornamental leading-tight">
                                {product.title[locale]}
                            </h1>

                            <div className="flex items-end gap-4 mb-8 pb-8 border-b border-[#C9A227]/20">
                                <div className="flex flex-col">
                                    <span className="text-sm text-[#F5ECD7]/60 mb-1">{locale === 'ru' ? 'Цена' : 'Price'}</span>
                                    <span className="text-4xl font-bold text-[#C9A227] font-elegant drop-shadow-sm">
                                        {formatPrice(totalPrice)}
                                    </span>
                                </div>
                                <span className="mb-2 px-3 py-1 bg-[#1A1517] border border-[#2E7D32]/50 text-[#4CAF50] rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(46,125,50,0.2)]">
                                    <Check size={12} strokeWidth={3} />
                                    {locale === 'ru' ? 'В наличии' : 'In Stock'}
                                </span>
                            </div>

                            {/* Variations Selector */}
                            {effectiveVariations.length > 0 && (
                                <VariationSelector
                                    variations={effectiveVariations}
                                    selectedVariations={selectedVariations}
                                    onSelectionChange={(newSelection, details) => {
                                        setSelectedVariations(newSelection);
                                        setVariationDetails(details);
                                    }}
                                    locale={locale as 'en' | 'ru'}
                                />
                            )}

                            {/* Actions */}
                            <div className="space-y-6 mt-6">
                                <button
                                    onClick={handleAddToCart}
                                    disabled={addedToCart}
                                    className={`w-full py-5 rounded-xl text-lg font-bold shadow-[0_0_20px_rgba(201,162,39,0.3)] hover:shadow-[0_0_30px_rgba(201,162,39,0.6)] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 relative overflow-hidden group ${addedToCart
                                        ? 'bg-green-600 text-white cursor-default hover:translate-y-0'
                                        : 'btn-metallic-gold text-[#0D0A0B]'
                                        }`}
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        {addedToCart ? (
                                            <>
                                                <Check size={24} />
                                                {locale === 'ru' ? 'Добавлено в корзину' : 'Added to Cart'}
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart size={24} />
                                                {t('product.addToCart') || 'Add to Cart'}
                                            </>
                                        )}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Full-width Description Section */}
                    <div className="mt-12 pt-8 border-t border-[#C9A227]/20">
                        <h2 className="text-2xl font-bold text-[#E8D48B] font-ornamental mb-6">
                            {locale === 'ru' ? 'Описание' : 'Description'}
                        </h2>
                        <div className="prose prose-invert prose-p:text-[#F5ECD7]/80 prose-headings:text-[#E8D48B] prose-strong:text-[#C9A227] prose-li:text-[#F5ECD7]/80 max-w-none leading-relaxed font-sans">
                            <Markdown
                                components={{
                                    h1: ({ ...props }) => <h3 className="text-2xl font-bold mt-6 mb-3 font-ornamental text-[#E8D48B]" {...props} />,
                                    h2: ({ ...props }) => <h4 className="text-xl font-bold mt-5 mb-2 font-ornamental text-[#E8D48B]" {...props} />,
                                    h3: ({ ...props }) => <h5 className="text-lg font-bold mt-4 mb-2 font-ornamental text-[#E8D48B]" {...props} />,
                                    ul: ({ ...props }) => <ul className="list-disc pl-5 my-4 space-y-1 marker:text-[#C9A227]" {...props} />,
                                    ol: ({ ...props }) => <ol className="list-decimal pl-5 my-4 space-y-1 marker:text-[#C9A227]" {...props} />,
                                    li: ({ ...props }) => <li className="pl-1" {...props} />,
                                    p: ({ ...props }) => <p className="mb-4" {...props} />,
                                    strong: ({ ...props }) => <strong className="font-bold text-[#C9A227]" {...props} />,
                                    em: ({ ...props }) => <em className="italic text-[#E8D48B]" {...props} />,
                                    img: () => null,
                                }}
                            >
                                {product.description[locale]}
                            </Markdown>
                        </div>
                    </div>

                    {/* Related Products */}
                    <RelatedProducts currentProductId={product.id} category={product.category || 'general'} />

                </div>
            </div>

            <Footer />
        </main>
    );
}

export default function ProductDetailsPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-gradient-to-b from-[#2D1B1F] to-[#1A1517] flex items-center justify-center">
                <div className="text-[#C9A227] animate-pulse">Loading...</div>
            </main>
        }>
            <ProductContent />
        </Suspense>
    );
}
