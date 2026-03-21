import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Каталог — Catalog',
    description:
        'Каталог священных ведических артефактов — янтры, кавача и другие сакральные предметы. Browse our collection of sacred Vedic artifacts.',
    alternates: {
        canonical: '/catalog/',
    },
    openGraph: {
        title: 'Каталог | Somanatha',
        description:
            'Sacred Yantras and Kavacha — browse our full collection of authentic Vedic items.',
    },
};

export default function CatalogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
