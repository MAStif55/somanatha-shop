'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types/product';

// Dynamic Components (Lazy Load)
const TrustSignals = dynamic(() => import('@/components/TrustSignals'), { ssr: false });
const Testimonials = dynamic(() => import('@/components/Testimonials'), { ssr: false });
const AboutSnippet = dynamic(() => import('@/components/AboutSnippet'), { ssr: false });

interface HomePageContentProps {
    initialProducts: Product[];
}

export default function HomePageContent({ initialProducts }: HomePageContentProps) {
    const { locale } = useLanguage();

    return (
        <main className="min-h-screen bg-[#0D0A0B]">
            {/* ================================================================
                HERO SECTION - 70vh Premium Design
                ================================================================ */}
            <section
                className="relative min-h-[60vh] flex flex-col bg-hero-premium"
            >
                {/* Ambient glow effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C9A227] opacity-5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#8B6914] opacity-5 rounded-full blur-3xl"></div>
                </div>

                {/* Header - overlaid on hero */}
                <Header variant="transparent" />

                {/* Hero Content */}
                <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-12 md:pb-16 relative z-10">
                    <div className="text-center max-w-5xl w-full">
                        {/* Ornamental Divider */}
                        <div className="divider-ornamental mb-8">
                            <span className="text-[#C9A227] text-4xl animate-pulse-glow px-4">☸</span>
                        </div>

                        {/* Main Title - Dramatic & Ornamental */}
                        <h1 className="mb-6 md:mb-8">
                            {locale === 'ru' ? (
                                <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-ornamental text-glow-gold text-[#E8D48B] leading-tight">
                                    Ведические Артефакты
                                </span>
                            ) : (
                                <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-ornamental text-glow-gold text-[#E8D48B] leading-tight">
                                    Vedic Artifacts
                                </span>
                            )}
                        </h1>

                        {/* Subtitle */}
                        <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-[#F5ECD7]/80 max-w-xs sm:max-w-md md:max-w-xl lg:max-w-none mx-auto mb-8 md:mb-12 leading-relaxed font-elegant italic px-2">
                            {locale === 'ru'
                                ? '✦ Янтры и Кавача — предметы для духовной практики, защиты и благополучия ✦'
                                : '✦ Yantras and Kavacha — objects for spiritual practice, protection and well-being ✦'}
                        </p>

                        {/* CTA Buttons - Metallic Style */}
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <Link
                                href="/catalog"
                                className="btn-metallic-gold inline-flex items-center justify-center gap-3 px-10 py-5 rounded-lg text-lg tracking-wide"
                            >
                                {locale === 'ru' ? 'Открыть Каталог' : 'Explore Catalog'}
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>

                        </div>
                    </div>
                </div>

                {/* Smooth transition to next section */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#1A1517] via-[#1A1517]/60 to-transparent pointer-events-none z-10"></div>
            </section>

            {/* TRUST SIGNALS - Immediately build credibility */}
            <TrustSignals />

            {/* NEW ARRIVALS */}
            {initialProducts.length > 0 && (
                <section className="py-24 px-6 bg-[#1A1517] bg-sacred-pattern relative">
                    {/* Gradient Mask for top edge of pattern */}
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#1A1517] to-transparent pointer-events-none z-0"></div>

                    <div className="max-w-6xl mx-auto relative z-10">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl md:text-5xl font-ornamental text-[#E8D48B] text-glow-gold">
                                {locale === 'ru' ? 'Новые Поступления' : 'New Arrivals'}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                            {initialProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        <div className="text-center mt-12">
                            <Link
                                href="/catalog"
                                className="text-[#E8D48B] border-b border-[#E8D48B] hover:text-[#C9A227] hover:border-[#C9A227] transition-all pb-1 uppercase tracking-wider text-sm font-bold"
                            >
                                {locale === 'ru' ? 'Смотреть весь каталог' : 'View Full Catalog'}
                            </Link>
                        </div>
                    </div>
                </section>
            )}



            {/* TESTIMONIALS - Social Proof */}
            <Testimonials />

            {/* ABOUT SNIPPET - Mission Statement */}
            <AboutSnippet />

            <Footer />
        </main>
    );
}
