'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCartStore } from '@/store/cart-store';
import { useCartUIStore } from '@/store/cart-ui-store';
import { formatPrice } from '@/utils/currency';
import { useStoreSettings } from '@/hooks/useStoreSettings';

export default function CartDrawer() {
    const { locale, t } = useLanguage();
    const {
        items,
        removeItem,
        updateQuantity,
        getTotalPrice,
        clearCart,
        getFreeShippingThreshold,
        getGiftThreshold,
        isFreeShippingEligible,
        getDiscount,
        getFinalPrice,
        getTotalItems,
        getShippingCost,
        setShippingConfig
    } = useCartStore();
    const { isDrawerOpen, closeDrawer } = useCartUIStore();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    const { settings } = useStoreSettings();

    // Sync shipping config from database settings into cart store
    useEffect(() => {
        if (settings.shipping) {
            setShippingConfig(settings.shipping.price, settings.shipping.freeThreshold);
        }
    }, [settings.shipping, setShippingConfig]);

    // Hydration safety
    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isDrawerOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDrawer();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [closeDrawer]);

    if (!mounted) return null;
    if (pathname?.startsWith('/admin')) return null;

    const isEmpty = items.length === 0;
    const subtotal = getTotalPrice();
    const discount = getDiscount();
    const finalPrice = getFinalPrice();

    // Free Shipping Logic
    const freeShippingRemaining = getFreeShippingThreshold();
    const isFreeShipping = isFreeShippingEligible();
    const freeShippingProgress = Math.min(100, (subtotal / 3000) * 100);

    // Gift Logic
    const giftRemaining = getGiftThreshold();
    const totalItems = getTotalItems();
    // Same logic as CartPage
    const isGiftSuccess = totalItems > 0 && totalItems % 11 === 0;
    const giftProgress = isGiftSuccess ? 100 : ((totalItems % 11) / 11) * 100;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={closeDrawer}
            />

            {/* Drawer Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-gradient-to-b from-[#1A1517] to-[#0D0A0B] border-l border-[#C9A227]/30 shadow-2xl z-[100] transform transition-transform duration-300 ease-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#C9A227]/20">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="text-[#C9A227]" size={24} />
                        <h2 className="text-xl font-bold text-[#E8D48B] font-ornamental">
                            {t('cart.title')}
                        </h2>
                        <span className="bg-[#C9A227] text-[#0D0A0B] text-xs font-bold px-2 py-0.5 rounded-full">
                            {items.length}
                        </span>
                    </div>
                    <button
                        onClick={closeDrawer}
                        className="p-2 rounded-lg hover:bg-[#C9A227]/20 text-[#F5ECD7]/60 hover:text-[#E8D48B] transition-colors"
                        aria-label="Close cart"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bars (Only show when cart is not empty) */}
                {!isEmpty && (
                    <div className="p-4 space-y-4 border-b border-[#C9A227]/10 bg-[#0D0A0B]/30">
                        {/* Free Shipping Bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className={`font-medium ${isFreeShipping ? 'text-green-400' : 'text-[#E8D48B]'}`}>
                                    {isFreeShipping
                                        ? t('cart.freeShippingSuccess')
                                        : t('cart.freeShippingRemaining', { amount: formatPrice(freeShippingRemaining) })}
                                </span>
                                <span className="text-[#C9A227]/60">{Math.round(freeShippingProgress)}%</span>
                            </div>
                            <div className="h-1.5 bg-[#2A2527] rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ease-out ${isFreeShipping ? 'bg-green-500' : 'bg-gradient-to-r from-[#C9A227] to-[#8B7D4B]'}`}
                                    style={{ width: `${freeShippingProgress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Gift Item Bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className={`font-medium ${isGiftSuccess ? 'text-green-400' : 'text-[#E8D48B]'}`}>
                                    {isGiftSuccess
                                        ? t('cart.giftSuccess')
                                        : t('cart.giftRemaining', { count: giftRemaining })}
                                </span>
                                <span className="text-[#C9A227]/60">{Math.round(giftProgress)}%</span>
                            </div>
                            <div className="h-1.5 bg-[#2A2527] rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ease-out ${isGiftSuccess ? 'bg-green-500' : 'bg-gradient-to-r from-[#C9A227] to-[#8B7D4B]'}`}
                                    style={{ width: `${giftProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="text-6xl mb-4 opacity-50">🛒</div>
                            <p className="text-[#F5ECD7]/60 mb-2">
                                {t('cart.empty')}
                            </p>
                            <p className="text-sm text-[#F5ECD7]/40">
                                {locale === 'ru'
                                    ? 'Добавьте товары из каталога'
                                    : 'Add items from the catalog'}
                            </p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="bg-[#0D0A0B]/50 rounded-xl p-3 border border-[#C9A227]/10 hover:border-[#C9A227]/30 transition-colors"
                            >
                                <div className="flex gap-3">
                                    {/* Image */}
                                    <Link
                                        href={`/product/${item.productSlug || item.productId}`}
                                        onClick={closeDrawer}
                                        className="w-16 h-16 rounded-lg overflow-hidden bg-[#2A2527] flex-shrink-0 border border-[#C9A227]/20 hover:border-[#C9A227]/50 transition-colors"
                                    >
                                        {item.productImage ? (
                                            <img
                                                src={item.productImage}
                                                alt={typeof item.productTitle === 'object' ? item.productTitle[locale] : item.productTitle}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl text-[#C9A227]/30">
                                                🕉️
                                            </div>
                                        )}
                                    </Link>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/product/${item.productSlug || item.productId}`}
                                            onClick={closeDrawer}
                                            className="block"
                                        >
                                            <h3 className="text-sm font-bold text-[#E8D48B] truncate hover:text-[#C9A227] transition-colors">
                                                {typeof item.productTitle === 'object'
                                                    ? item.productTitle[locale]
                                                    : item.productTitle}
                                            </h3>
                                        </Link>
                                        {item.configuration && Object.keys(item.configuration).length > 0 && (
                                            <p className="text-xs text-[#F5ECD7]/50 truncate">
                                                {Object.values(item.configuration).join(', ')}
                                            </p>
                                        )}
                                        <p className="text-[#C9A227] font-bold text-sm mt-1">
                                            {formatPrice(item.price * item.quantity)}
                                        </p>
                                    </div>

                                    {/* Remove */}
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors self-start top-0"
                                        aria-label={locale === 'ru' ? 'Удалить товар' : 'Remove item'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex items-center justify-end gap-2 mt-2">
                                    <button
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className="w-7 h-7 rounded-md bg-[#2A2527] text-[#C9A227] hover:bg-[#C9A227] hover:text-[#0D0A0B] transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                                        aria-label={locale === 'ru' ? 'Уменьшить количество' : 'Decrease quantity'}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center text-sm font-bold text-[#F5ECD7]">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        className="w-7 h-7 rounded-md bg-[#2A2527] text-[#C9A227] hover:bg-[#C9A227] hover:text-[#0D0A0B] transition-colors flex items-center justify-center"
                                        aria-label={locale === 'ru' ? 'Увеличить количество' : 'Increase quantity'}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {!isEmpty && (
                    <div className="p-4 border-t border-[#C9A227]/20 space-y-4 bg-[#0D0A0B]/80">
                        {/* Summary breakdown */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center text-[#F5ECD7]/60">
                                <span>{t('cart.subtotal')}:</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between items-center text-green-400">
                                    <span>{t('cart.discount')}:</span>
                                    <span>-{formatPrice(discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-[#F5ECD7]/60">
                                <span>{t('cart.shipping')}:</span>
                                <span className={isFreeShipping ? 'text-green-400' : ''}>
                                    {isFreeShipping ? t('cart.free') : formatPrice(getShippingCost())}
                                </span>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center pt-2 border-t border-[#C9A227]/10">
                            <span className="text-[#F5ECD7]/70 font-medium">
                                {t('cart.total')}:
                            </span>
                            <span className="text-2xl font-bold text-[#E8D48B] text-glow-gold">
                                {formatPrice(finalPrice)}
                            </span>
                        </div>

                        {/* Buttons */}
                        <div className="space-y-2">
                            <Link
                                href="/checkout"
                                onClick={closeDrawer}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-[#C9A227] to-[#8B6914] text-[#0D0A0B] font-bold uppercase tracking-wide hover:shadow-[0_0_20px_rgba(201,162,39,0.5)] transition-all border border-[#C9A227]"
                            >
                                {t('cart.checkout')}
                            </Link>
                            <Link
                                href="/cart"
                                onClick={closeDrawer}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#C9A227]/50 text-[#C9A227] font-medium hover:bg-[#C9A227]/10 hover:border-[#C9A227] transition-all"
                            >
                                {locale === 'ru' ? 'Открыть корзину' : 'View Cart'}
                            </Link>
                        </div>

                        {/* Clear Cart */}
                        <button
                            onClick={() => {
                                clearCart();
                                closeDrawer();
                            }}
                            className="w-full text-center text-sm text-red-400/60 hover:text-red-400 transition-colors"
                        >
                            {locale === 'ru' ? 'Очистить корзину' : 'Clear Cart'}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
