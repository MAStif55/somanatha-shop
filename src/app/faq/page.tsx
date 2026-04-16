'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { ReactNode } from 'react';

// Config-based link mapping — easy to update if Elena changes the link structure
const LINK_MAP: Record<string, { pattern: RegExp; href: string }[]> = {
    ru: [
        { pattern: /доставк[уиае]/gi, href: '/shipping' },
        { pattern: /оплат[уыаеой]/gi, href: '/shipping' },
        { pattern: /каталог[аеу]?/gi, href: '/catalog' },
        { pattern: /офер[тыуае]/gi, href: '/offer' },
        { pattern: /контакт[ыаеов]*/gi, href: '/about' },
    ],
    en: [
        { pattern: /shipping|delivery/gi, href: '/shipping' },
        { pattern: /payment/gi, href: '/shipping' },
        { pattern: /catalog/gi, href: '/catalog' },
        { pattern: /offer/gi, href: '/offer' },
        { pattern: /contact/gi, href: '/about' },
    ],
};

function linkifyText(text: string, locale: string): ReactNode[] {
    const rules = LINK_MAP[locale] || LINK_MAP.en;
    // Combine all patterns into one regex with capture groups
    const combined = new RegExp(
        `(${rules.map(r => r.pattern.source).join('|')})`,
        'gi'
    );

    const parts = text.split(combined);
    return parts.map((part, i) => {
        if (!part) return null;
        // Check if this part matches any rule
        for (const rule of rules) {
            if (new RegExp(`^${rule.pattern.source}$`, 'i').test(part)) {
                return (
                    <Link
                        key={i}
                        href={rule.href}
                        className="text-[#C9A227] hover:text-[#E8D48B] underline underline-offset-2 decoration-[#C9A227]/40 hover:decoration-[#E8D48B] transition-colors"
                    >
                        {part}
                    </Link>
                );
            }
        }
        return <span key={i}>{part}</span>;
    });
}

export default function FAQPage() {
    const { locale } = useLanguage();

    const faqs = [
        {
            q: { en: 'Are the materials authentic?', ru: 'Материалы подлинные?' },
            a: { en: 'Yes, we use only high-purity copper and 24K gold plating certified for Vedic use. You can find more details in our catalog.', ru: 'Да, мы используем только медь высокой чистоты и золотое покрытие 24К, сертифицированные для ведического использования. Подробнее о товарах вы можете узнать в нашем каталоге.' }
        },
        {
            q: { en: 'How do I maintain the Yantra?', ru: 'Как ухаживать за янтрой?' },
            a: { en: 'Simply wipe with a soft dry cloth. Avoid water and harsh chemicals. You may offer incense smoke.', ru: 'Просто протирайте мягкой сухой тканью. Избегайте воды и агрессивных химикатов. Можно окуривать благовониями.' }
        },
        {
            q: { en: 'Where do you ship from?', ru: 'Откуда осуществляется доставка?' },
            a: { en: 'We ship directly from our workshop in Thailand. For details, see our shipping and payment page.', ru: 'Мы отправляем заказы напрямую из нашей мастерской в Таиланде. Подробнее об условиях — на странице доставки и оплаты.' }
        },
        {
            q: { en: 'How can I contact you?', ru: 'Как с вами связаться?' },
            a: { en: 'You can reach us through our contact page — we respond within 24 hours.', ru: 'Вы можете написать нам через страницу контактов — мы отвечаем в течение 24 часов.' }
        },
        {
            q: { en: 'Do you accept returns?', ru: 'Можно ли вернуть товар?' },
            a: { en: 'Return conditions are described in our offer agreement and on the shipping page.', ru: 'Условия возврата описаны в нашей оферте и на странице доставки.' }
        }
    ];

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#2D1B1F] to-[#1A1517] flex flex-col">
            <Header />

            <div className="flex-1 w-full bg-sacred-pattern relative">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#2D1B1F] to-transparent pointer-events-none z-0"></div>

                <div className="max-w-3xl mx-auto px-6 py-16 relative z-10">
                    <h1 className="text-3xl sm:text-4xl font-ornamental text-[#E8D48B] mb-2 text-center text-glow-gold">
                        {locale === 'ru' ? 'Частые вопросы' : 'FAQ'}
                    </h1>
                    <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#C9A227] to-transparent mx-auto rounded-full mb-12"></div>

                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <details
                                key={idx}
                                className="group bg-[#0D0A0B]/60 rounded-xl border border-[#C9A227]/15 hover:border-[#C9A227]/30 transition-colors overflow-hidden"
                            >
                                <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                                    <h3 className="text-base sm:text-lg font-bold text-[#E8D48B]">{faq.q[locale]}</h3>
                                    <span className="text-[#C9A227]/60 group-open:rotate-45 transition-transform duration-200 text-xl flex-shrink-0">+</span>
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <p className="text-[#F5ECD7]/70 leading-relaxed">
                                        {linkifyText(faq.a[locale], locale)}
                                    </p>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
