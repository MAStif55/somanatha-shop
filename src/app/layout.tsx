import type { Metadata } from 'next';
import { Cinzel_Decorative, Cormorant_Garamond, Open_Sans } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LiveVideoProvider } from '@/contexts/LiveVideoContext';
import ToastContainer from '@/components/Toast';
import CartDrawer from '@/components/CartDrawer';
import dynamic from 'next/dynamic';
import YandexMetrika from '@/components/YandexMetrika';
import JsonLd from '@/components/JsonLd';

const BASE_URL = 'https://somanatha.ru';

const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Соманатха | Somanatha',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    image: `${BASE_URL}/og-default.png`,
    description: 'Ведический магазин сакральных артефактов, янтр и кавач.',
    address: {
        '@type': 'PostalAddress',
        addressCountry: 'RU',
    },
    sameAs: [
        // Add social links here when available
    ],
};

const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'Somanatha',
    publisher: {
        '@id': `${BASE_URL}/#organization`,
    },
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/catalog?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
    },
};


const UnderConstructionPopup = dynamic(
    () => import('@/components/UnderConstructionPopup'),
    { ssr: false },
);

const cinzel = Cinzel_Decorative({
    weight: ['400', '700', '900'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-cinzel',
});

const cormorant = Cormorant_Garamond({
    weight: ['400', '600', '700'],
    style: ['normal', 'italic'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-cormorant',
});

const openSans = Open_Sans({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-open-sans',
});

export const metadata: Metadata = {
    metadataBase: new URL('https://somanatha.ru'),
    title: {
        default: 'Соманатха | Somanatha — Ведический магазин',
        template: '%s | Somanatha',
    },
    description:
        'Священные Янтры и Кавача — эксклюзивные артефакты для духовной практики, защиты и гармонии. Authentic Vedic items for spiritual practice, protection and well-being.',
    icons: {
        icon: [
            { url: '/logo.png', sizes: '32x32', type: 'image/png' },
            { url: '/logo.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [
            { url: '/logo.png', sizes: '180x180', type: 'image/png' },
        ],
    },
    openGraph: {
        type: 'website',
        locale: 'ru_RU',
        siteName: 'Somanatha — Vedic Store',
        images: [{ url: '/og-default.png', width: 1200, height: 630 }],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${cinzel.variable} ${cormorant.variable} ${openSans.variable}`}>
            <body className={openSans.className}>
                <LanguageProvider>
                    <LiveVideoProvider>
                        <JsonLd schema={organizationSchema} />
                        <JsonLd schema={websiteSchema} />
                        {children}
                        <UnderConstructionPopup />
                        <CartDrawer />
                        <ToastContainer />
                    </LiveVideoProvider>
                </LanguageProvider>
                <YandexMetrika />
            </body>
        </html>
    );
}
