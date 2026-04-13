'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/utils/currency';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

import { useStoreSettings } from '@/hooks/useStoreSettings';

export default function CartPage() {
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
    const [mounted, setMounted] = useState(false);
    const { settings } = useStoreSettings();

    // Sync shipping config from Firestore settings into cart store
    useEffect(() => {
        if (settings.shipping) {
            setShippingConfig(settings.shipping.price, settings.shipping.freeThreshold);
        }
    }, [settings.shipping, setShippingConfig]);

    // Hydration-safe: wait for client mount before rendering cart data
    useEffect(() => {
        setMounted(true);
    }, []);

    // Show loading state during hydration
    if (!mounted) {
        return (
            <main className="min-h-screen bg-gradient-to-b from-[#0D0A0B] via-[#1A1517] to-[#0D0A0B] flex flex-col">
                <Header />
                <section className="py-12 px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-ornamental text-[#E8D48B] mb-2 text-glow-gold">
                        {t('cart.title')}
                    </h2>
                </section>
                <section className="flex-1 py-8 px-6 max-w-4xl mx-auto w-full">
                    <div className="bg-[#1A1517] border border-[#C9A227]/20 rounded-2xl p-8 animate-pulse">
                        <div className="h-20 bg-[#2A2527] rounded-lg mb-4"></div>
                        <div className="h-20 bg-[#2A2527] rounded-lg"></div>
                    </div>
                </section>
                <Footer />
            </main>
        );
    }

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
    // If totalItems is multiple of 11 and > 0, we just got a gift, so progress is 100 (or 0 for next cycle).
    // Requirement: "Success States: When a threshold is met... fill to 100% and show a success message"
    // So if (totalItems % 11 === 0 && totalItems > 0), we are at a success state for the *current* gift.
    // However, the next item starts a new cycle. 
    // Let's visualize it as: 0 items = 0%, 1 item = 1/11%, ..., 10 items = 10/11%, 11 items = 100% (Success!)
    // then 12 items = 1/11% (next cycle).
    const isGiftSuccess = totalItems > 0 && totalItems % 11 === 0;
    const giftProgress = isGiftSuccess ? 100 : ((totalItems % 11) / 11) * 100;

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0D0A0B] via-[#1A1517] to-[#0D0A0B] flex flex-col">
            <Header />

            {/* Hero Banner */}
            <section
                className="py-12 px-6 text-center relative overflow-hidden"
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #C9A227 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                <h2 className="text-3xl md:text-4xl font-ornamental text-[#E8D48B] mb-2 relative z-10 text-glow-gold">
                    {t('cart.title')}
                </h2>
                <p className="text-[#C9A227]/80 relative z-10 tracking-wider">
                    {isEmpty
                        ? (locale === 'ru' ? 'Ваша корзина пуста' : 'Your cart is empty')
                        : (locale === 'ru' ? `${items.length} товар(ов)` : `${items.length} item(s)`)}
                </p>
            </section>

            {/* Cart Content */}
            <section className="flex-1 py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto w-full">
                {isEmpty ? (
                    <div className="text-center py-16 bg-[#1A1517] border border-[#C9A227]/20 rounded-2xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#C9A227]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <div className="text-7xl mb-6 opacity-80">🛒</div>
                        <h3 className="text-2xl font-bold text-[#E8D48B] mb-4 font-ornamental">
                            {t('cart.empty')}
                        </h3>
                        <p className="text-[#F5ECD7]/60 mb-8 max-w-md mx-auto">
                            {locale === 'ru'
                                ? 'Добавьте товары из каталога, чтобы оформить заказ'
                                : 'Add items from the catalog to place an order'}
                        </p>
                        <Link
                            href="/catalog"
                            className="relative z-10 inline-flex items-center gap-2 bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] px-8 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(201,162,39,0.4)] transition-all transform hover:-translate-y-1"
                        >
                            {t('cart.continueShopping')}
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* Progress Bars */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Free Shipping Bar */}
                            <div className="bg-[#1A1517] border border-[#C9A227]/20 rounded-xl p-4 shadow-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-sm font-medium ${isFreeShipping ? 'text-green-400' : 'text-[#E8D48B]'}`}>
                                        {isFreeShipping
                                            ? t('cart.freeShippingSuccess')
                                            : t('cart.freeShippingRemaining', { amount: formatPrice(freeShippingRemaining) })}
                                    </span>
                                    <span className="text-[#C9A227] text-xs font-mono">{Math.round(freeShippingProgress)}%</span>
                                </div>
                                <div className="h-2 bg-[#2A2527] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ease-out ${isFreeShipping ? 'bg-green-500' : 'bg-gradient-to-r from-[#C9A227] to-[#8B7D4B]'}`}
                                        style={{ width: `${freeShippingProgress}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Gift Item Bar */}
                            <div className="bg-[#1A1517] border border-[#C9A227]/20 rounded-xl p-4 shadow-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-sm font-medium ${isGiftSuccess ? 'text-green-400' : 'text-[#E8D48B]'}`}>
                                        {isGiftSuccess
                                            ? t('cart.giftSuccess')
                                            : t('cart.giftRemaining', { count: giftRemaining })}
                                    </span>
                                    <span className="text-[#C9A227] text-xs font-mono">{Math.round(giftProgress)}%</span>
                                </div>
                                <div className="h-2 bg-[#2A2527] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ease-out ${isGiftSuccess ? 'bg-green-500' : 'bg-gradient-to-r from-[#C9A227] to-[#8B7D4B]'}`}
                                        style={{ width: `${giftProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Cart Items */}
                        <div className="bg-[#1A1517] border border-[#C9A227]/20 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
                            {items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 ${index !== items.length - 1 ? 'border-b border-[#C9A227]/10' : ''} hover:bg-[#C9A227]/5 transition-colors`}
                                >
                                    {/* Product Image */}
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#2A2527] rounded-lg flex items-center justify-center text-2xl sm:text-3xl overflow-hidden border border-[#C9A227]/20 flex-shrink-0">
                                        {item.productImage ? (
                                            <img src={item.productImage} alt={typeof item.productTitle === 'object' ? item.productTitle[locale] : item.productTitle} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>🕉️</span>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                                        <h4 className="font-bold text-[#E8D48B] text-lg sm:text-xl pr-2">
                                            {typeof item.productTitle === 'object'
                                                ? item.productTitle[locale]
                                                : item.productTitle}
                                            {item.configuration && Object.keys(item.configuration).length > 0 && (
                                                <span className="text-[#F5ECD7]/60 font-normal text-base sm:text-lg ml-2">
                                                    ({Object.values(item.configuration).join(', ')})
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-[#C9A227] font-mono text-base sm:text-lg">
                                            {formatPrice(item.price)}
                                        </p>
                                    </div>

                                    {/* Quantity and Controls */}
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        {/* Quantity */}
                                        <div className="flex items-center gap-2 bg-[#0D0A0B]/50 rounded-lg p-1 border border-[#C9A227]/20">
                                            <button
                                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                className="w-7 h-7 flex items-center justify-center rounded-md bg-[#2A2527] text-[#C9A227] hover:bg-[#C9A227] hover:text-[#0D0A0B] transition-colors"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center font-bold text-[#F5ECD7]">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-7 h-7 flex items-center justify-center rounded-md bg-[#2A2527] text-[#C9A227] hover:bg-[#C9A227] hover:text-[#0D0A0B] transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-full"
                                            title={t('cart.remove')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Cart Summary */}
                        <div className="bg-[#1A1517] border border-[#C9A227]/20 rounded-2xl shadow-xl p-6">
                            {/* Subtotal */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[#F5ECD7]/70">{t('cart.subtotal')}:</span>
                                <span className="text-xl font-medium text-[#E8D48B]">
                                    {formatPrice(subtotal)}
                                </span>
                            </div>

                            {/* Discount */}
                            {discount > 0 && (
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-green-400/80">{t('cart.discount')}:</span>
                                    <span className="text-xl font-medium text-green-400">
                                        -{formatPrice(discount)}
                                    </span>
                                </div>
                            )}

                            {/* Shipping */}
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[#F5ECD7]/70">{t('cart.shipping')}:</span>
                                <span className={`text-xl font-medium ${isFreeShippingEligible() ? 'text-green-400' : 'text-[#E8D48B]'}`}>
                                    {isFreeShippingEligible() ? t('cart.free') : formatPrice(getShippingCost())}
                                </span>
                            </div>

                            {/* Total Separator */}
                            <div className="border-t border-[#C9A227]/20 my-4"></div>

                            {/* Total */}
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-lg font-bold text-[#F5ECD7]/90">{t('cart.total')}:</span>
                                <span className="text-3xl font-bold text-[#E8D48B] text-glow-gold">
                                    {formatPrice(finalPrice)}
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/catalog"
                                    className="flex-1 text-center border border-[#C9A227]/50 text-[#C9A227] px-6 py-3 rounded-xl font-bold hover:bg-[#C9A227]/10 hover:border-[#C9A227] transition-all"
                                >
                                    {t('cart.continueShopping')}
                                </Link>
                                <Link
                                    href="/checkout"
                                    className="flex-1 bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] px-6 py-3 rounded-xl font-bold hover:shadow-[0_0_15px_rgba(201,162,39,0.4)] transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    {t('cart.checkout')}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>
                        </div>

                        {/* Clear Cart */}
                        <div className="text-center">
                            <button
                                onClick={clearCart}
                                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors hover:underline"
                            >
                                {locale === 'ru' ? 'Очистить корзину' : 'Clear Cart'}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            <Footer />
        </main>
    );
}
