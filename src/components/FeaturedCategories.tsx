'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { CATEGORIES } from '@/types/category';
import { ArrowRight } from 'lucide-react';

export default function FeaturedCategories() {
    const { locale, t } = useLanguage();

    return (
        <section id="categories" className="py-24 px-6 bg-[#0D0A0B] relative overflow-hidden">
            {/* Soft border transition from previous section */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#1A1517] to-transparent pointer-events-none z-10"></div>

            {/* Background ambient light */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C9A227] opacity-[0.02] rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-7xl mx-auto relative z-20">
                <div className="text-center mb-16">
                    {/* Collections label removed */}
                    <h2 className="text-4xl md:text-5xl font-ornamental text-[#E8D48B] text-glow-gold">
                        {locale === 'ru' ? 'Священные Категории' : 'Sacred Categories'}
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {CATEGORIES.map((cat) => (
                        <Link
                            key={cat.slug}
                            href={`/catalog/${cat.slug}`}
                            className="group relative block h-80 rounded-2xl overflow-hidden border border-[#C9A227]/20"
                        >
                            {/* Background Placeholder Gradient - normally this would be an image */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#2D1B1F] to-[#0D0A0B] group-hover:scale-105 transition-transform duration-700"></div>

                            {/* Decorative Overlay */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0D0A0B] via-transparent to-transparent opacity-80"></div>

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 p-8 w-full">
                                <div className="text-5xl mb-4 transform group-hover:-translate-y-2 transition-transform duration-300">
                                    {cat.icon}
                                </div>
                                <h3 className="text-3xl font-elegant text-[#F5ECD7] mb-2 group-hover:text-[#C9A227] transition-colors">
                                    {cat.title[locale]}
                                </h3>
                                <p className="text-[#F5ECD7]/60 mb-6 max-w-sm line-clamp-2">
                                    {cat.description[locale]}
                                </p>

                                <div className="flex items-center gap-2 text-[#C9A227] font-semibold text-sm uppercase tracking-wider opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                    {locale === 'ru' ? 'Смотреть' : 'Explore'}
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
