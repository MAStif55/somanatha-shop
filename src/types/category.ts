/**
 * Category Types and Configuration
 * 
 * Defines the product categories for Somanatha Shop (Vedic Store).
 */

export type CategorySlug = 'yantras' | 'kavacha';

export interface SubCategory {
    id?: string;
    slug: string;
    title: { en: string; ru: string };
    parentCategory?: CategorySlug;
}

export interface Category {
    slug: CategorySlug;
    title: { en: string; ru: string };
    description: { en: string; ru: string };
    icon?: string;
    // subcategories are now fetched dynamically
}

/**
 * Available Categories
 * 
 * These are the main product categories for the Vedic Store.
 */
export const CATEGORIES: Category[] = [
    {
        slug: 'yantras',
        title: {
            en: 'Yantras',
            ru: 'Янтры'
        },
        description: {
            en: 'Sacred geometric diagrams used in worship and meditation',
            ru: 'Священные геометрические диаграммы для поклонения и медитации'
        },
        icon: '🕉️'
    },
    {
        slug: 'kavacha',
        title: {
            en: 'Kavacha',
            ru: 'Кавача'
        },
        description: {
            en: 'Protective amulets and talismans with sacred mantras',
            ru: 'Защитные амулеты и талисманы со священными мантрами'
        },
        icon: '🛡️'
    }
];

/**
 * Get category by slug
 */
export function getCategoryBySlug(slug: string): Category | undefined {
    return CATEGORIES.find(cat => cat.slug === slug);
}

/**
 * Get all category slugs
 */
export function getAllCategorySlugs(): CategorySlug[] {
    return CATEGORIES.map(cat => cat.slug);
}
