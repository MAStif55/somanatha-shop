'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NotFound() {
    const { locale } = useLanguage();

    return (
        <main className="min-h-screen bg-[#0D0A0B] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-sacred-pattern opacity-10 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C9A227] opacity-[0.03] rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
                <div className="text-[150px] font-ornamental text-[#2D1B1F] leading-none opacity-50 select-none">
                    404
                </div>
                <div className="text-6xl mb-8 animate-pulse text-[#C9A227]">
                    ☸
                </div>

                <h1 className="text-4xl md:text-5xl font-ornamental text-[#E8D48B] mb-6">
                    {locale === 'ru' ? 'Путь в Никуда' : 'Path to the Void'}
                </h1>

                <p className="text-xl text-[#F5ECD7]/60 mb-12 font-elegant italic max-w-lg mx-auto">
                    {locale === 'ru'
                        ? 'Страница, которую вы ищете, растворилась в пустоте.'
                        : 'The page you are looking for has dissolved into the ether.'}
                </p>

                <Link
                    href="/"
                    className="btn-metallic-gold px-10 py-4 rounded-lg font-bold text-[#0D0A0B] inline-block hover:scale-105 transition-transform"
                >
                    {locale === 'ru' ? 'Вернуться Домой' : 'Return Home'}
                </Link>
            </div>
        </main>
    );
}
