/**
 * Currency Formatting Utilities
 */

/**
 * Format price in Russian Rubles
 */
export function formatPrice(price: number): string {
    return `${price.toLocaleString('ru-RU')} ₽`;
}

// Alias for compatibility with admin components
export const formatCurrency = formatPrice;

/**
 * Format price with custom currency
 */
export function formatPriceCustom(
    price: number,
    locale: string = 'ru-RU',
    currency: string = 'RUB'
): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(price);
}

/**
 * Simple price format with symbol
 */
export function formatPriceSimple(price: number, symbol: string = '₽'): string {
    return `${price.toLocaleString('ru-RU')}${symbol}`;
}
