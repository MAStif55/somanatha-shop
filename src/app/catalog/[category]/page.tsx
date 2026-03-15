import type { Metadata } from 'next';
import { CATEGORIES, CategorySlug, getCategoryBySlug } from '@/types/category';
import CategoryPageContent from './CategoryPageContent';

// Required for static export with dynamic routes
export function generateStaticParams() {
    return CATEGORIES.map((category) => ({
        category: category.slug,
    }));
}

interface PageProps {
    params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { category } = await params;
    const cat = getCategoryBySlug(category);
    if (!cat) {
        return { title: 'Категория не найдена' };
    }
    return {
        title: `${cat.title.ru} — ${cat.title.en}`,
        description: cat.description.ru,
        alternates: {
            canonical: `/catalog/${category}/`,
        },
        openGraph: {
            title: `${cat.title.ru} | Somanatha`,
            description: cat.description.en,
        },
    };
}

export default async function CategoryPage({ params }: PageProps) {
    const { category } = await params;
    return <CategoryPageContent categorySlug={category as CategorySlug} />;
}
