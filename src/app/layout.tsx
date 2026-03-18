import type { Metadata } from 'next';
import { Cinzel_Decorative, Cormorant_Garamond, Open_Sans } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LiveVideoProvider } from '@/contexts/LiveVideoContext';
import ToastContainer from '@/components/Toast';
import CartDrawer from '@/components/CartDrawer';
import dynamic from 'next/dynamic';

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
        'Священные Янтры и Кавача — Sacred Yantras and Kavacha. Authentic Vedic items for spiritual practice.',
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
                        {children}
                        <UnderConstructionPopup />
                        <CartDrawer />
                        <ToastContainer />
                    </LiveVideoProvider>
                </LanguageProvider>
            </body>
        </html>
    );
}
