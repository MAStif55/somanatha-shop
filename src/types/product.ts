/**
 * Product Types
 * 
 * Define your product structure here.
 * These are example types - customize for your project.
 */

/**
 * Product Status types
 */
export type ProductStatus = 'available' | 'out_of_stock' | 'coming_soon' | 'hidden';

/**
 * Variation Option - single selectable option within a group
 */
export interface VariationOption {
    id: string;
    label: { en: string; ru: string };
    description?: { en: string; ru: string };
    priceModifier: number; // Price change (can be positive/negative)
    imageUrl?: string; // Optional thumbnail for visual selection (Legacy)
    image?: ProductImage; // Multi-resolution support
    status?: ProductStatus; // Option availability
}

/**
 * Variation Group - a category of options (e.g., Material, Size)
 */
export interface VariationGroup {
    id: string;
    name: { en: string; ru: string };
    options: VariationOption[];
    subcategories?: string[]; // Array of subcategory slugs this group applies to. Empty means all.
}

/**
 * Variation Overrides - controls how products inherit category defaults
 */
export interface VariationOverrides {
    useDefaults: boolean; // true = inherit from category, false = use custom variations only
    disabledOptions?: string[]; // Option IDs to hide from category defaults
}

/**
 * Product Image with SEO metadata and optimized variants
 */
export interface ProductImage {
    url: string;           // Full-resolution (1200px) — always present
    cardUrl?: string;      // Medium variant (600px) for product cards
    thumbUrl?: string;     // Small variant (300px) for thumbnails, cart, etc.
    alt: { en: string; ru: string };
    keywords?: string[];
}

/**
 * Helper to normalize images (handles backwards compatibility)
 */
export function normalizeImages(images: (string | ProductImage)[] | undefined): ProductImage[] {
    if (!images) return [];
    return images.map(img =>
        typeof img === 'string'
            ? { url: img, alt: { en: '', ru: '' } }
            : img
    );
}

/**
 * Helper to get full-resolution image URL (handles both string and ProductImage)
 */
export function getImageUrl(image: string | ProductImage): string {
    const url = typeof image === 'string' ? image : image.url;
    // Don't double encode if it's already encoded (%20)
    return url.includes('%') ? url : encodeURI(url);
}

/**
 * Helper to get card-size (600px) image URL with fallback to full-res
 */
export function getCardImageUrl(image: string | ProductImage): string {
    const url = typeof image === 'string' ? image : (image.cardUrl || image.url);
    return url.includes('%') ? url : encodeURI(url);
}

/**
 * Helper to get thumbnail-size (300px) image URL with fallback chain
 */
export function getThumbImageUrl(image: string | ProductImage): string {
    const url = typeof image === 'string' ? image : (image.thumbUrl || image.cardUrl || image.url);
    return url.includes('%') ? url : encodeURI(url);
}

/**
 * Helper to get image alt text (handles both string and ProductImage)
 */
export function getImageAlt(image: string | ProductImage, locale: 'en' | 'ru', fallback: string = ''): string {
    if (typeof image === 'string') return fallback;
    return image.alt[locale] || image.alt.ru || image.alt.en || fallback;
}

/**
 * Helper to get proper encoded video URL
 */
export function getVideoUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    return url.includes('%') ? url : encodeURI(url);
}

/**
 * Helper to get proper encoded video preview URL
 */
export function getVideoPreviewUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    return url.includes('%') ? url : encodeURI(url);
}

export interface Product {
    id: string;
    slug: string;
    title: { en: string; ru: string };
    shortDescription?: { en: string; ru: string };
    description: { en: string; ru: string };
    basePrice: number;
    images: (string | ProductImage)[]; // Supports both legacy strings and new ProductImage objects
    videoPreviewUrl?: string; // 480p compressed preview for product cards
    videoUrl?: string;        // 720p high-quality video for product detail page
    category?: string;
    subcategory?: string;
    tags?: string[];
    variations?: VariationGroup[]; // Custom variations (when not using defaults)
    variationOverrides?: VariationOverrides; // Category default controls
    status?: ProductStatus; // Product availability
    createdAt?: number; // timestamp
    order?: number; // for manual sorting
}

/**
 * Product Configuration Options
 * 
 * Use these for products with customizable options (size, material, etc.)
 */

export interface ProductOption {
    id: string;
    label: { en: string; ru: string };
    description?: { en: string; ru: string };
}

export interface PriceModifierOption extends ProductOption {
    priceMultiplier: number; // e.g., 1.0 for standard, 1.2 for premium
}

export interface PriceAddonOption extends ProductOption {
    priceAddon: number; // e.g., 0 for none, 50 for extra feature
}

export interface SizeOption {
    id: string;
    label: string;
    width: number;
    height: number;
    basePriceModifier: number;
}

/**
 * Product Configuration
 * 
 * Represents the selected options for a product.
 * Customize fields based on your product options.
 */
export interface ProductConfiguration {
    productId: string;
    [optionKey: string]: string; // Flexible key-value pairs for options
}
