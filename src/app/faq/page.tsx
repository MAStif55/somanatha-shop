'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FAQPage() {
    const { locale } = useLanguage();

    const faqs = [
        {
            q: { en: 'Are the materials authentic?', ru: 'Материалы подлинные?' },
            a: { en: 'Yes, we use only high-purity copper and 24K gold plating certified for Vedic use.', ru: 'Да, мы используем только медь высокой чистоты и золотое покрытие 24К, сертифицированные для ведического использования.' }
        },
        {
            q: { en: 'How do I maintain the Yantra?', ru: 'Как ухаживать за янтрой?' },
            a: { en: 'Simply wipe with a soft dry cloth. Avoid water and harsh chemicals. You may offer incense smoke.', ru: 'Просто протирайте мягкой сухой тканью. Избегайте воды и агрессивных химикатов. Можно окуривать благовониями.' }
        },
        {
            q: { en: 'Where do you ship from?', ru: 'Откуда осуществляется доставка?' },
            a: { en: 'We ship directly from our workshop in Thailand.', ru: 'Мы отправляем заказы напрямую из нашей мастерской в Таиланде.' }
        }
    ];

    return (
        <main className="min-h-screen bg-[#FAF9F6]">
            <Header />

            <div className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-ornamental text-[#2D1B1F] mb-2 text-center">
                    FAQ
                </h1>
                <div className="w-24 h-1 bg-[#C9A227] mx-auto rounded-full mb-12"></div>

                <div className="space-y-6">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-[#C9A227]/10 p-6">
                            <h3 className="text-lg font-bold text-[#8B4513] mb-2">{faq.q[locale]}</h3>
                            <p className="text-[#666] leading-relaxed">{faq.a[locale]}</p>
                        </div>
                    ))}
                </div>
            </div>

            <Footer />
        </main>
    );
}
