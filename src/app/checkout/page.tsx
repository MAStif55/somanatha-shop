'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCartStore } from '@/store/cart-store';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CheckoutForm from '@/components/CheckoutForm';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/utils/currency';
import { useStoreSettings } from '@/hooks/useStoreSettings';

export default function CheckoutPage() {
    const { locale, t } = useLanguage();
    const { items, getTotalPrice, getDiscount, getFinalPrice, getShippingCost, isFreeShippingEligible, setShippingConfig, removeItem, updateQuantity } = useCartStore();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
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

    useEffect(() => {
        if (mounted && items.length === 0) {
            router.push('/cart');
        }
    }, [items, router, mounted]);

    // Show loading state during hydration or if cart is empty
    if (!mounted) {
        return (
            <main className="min-h-screen bg-gradient-to-b from-[#0D0A0B] via-[#1A1517] to-[#0D0A0B] flex flex-col">
                <Header />
                <section className="py-12 px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-ornamental text-[#E8D48B] mb-2 text-glow-gold">
                        {locale === 'ru' ? 'Оформление заказа' : 'Checkout'}
                    </h2>
                </section>
                <section className="flex-1 py-8 px-6 max-w-6xl mx-auto w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-[#1A1517] border border-[#C9A227]/20 rounded-2xl p-6 animate-pulse">
                            <div className="h-6 bg-[#2A2527] rounded mb-4"></div>
                            <div className="h-20 bg-[#2A2527] rounded"></div>
                        </div>
                        <div className="bg-[#1A1517] border border-[#C9A227]/20 rounded-2xl p-6 animate-pulse">
                            <div className="h-6 bg-[#2A2527] rounded mb-4"></div>
                            <div className="h-40 bg-[#2A2527] rounded"></div>
                        </div>
                    </div>
                </section>
                <Footer />
            </main>
        );
    }

    if (items.length === 0) return null;

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
                    {locale === 'ru' ? 'Оформление заказа' : 'Checkout'}
                </h2>
                <p className="text-[#C9A227]/80 relative z-10 tracking-wider">
                    {locale === 'ru' ? 'Заполните данные для доставки' : 'Fill in your delivery details'}
                </p>
            </section>

            <section className="flex-1 py-8 sm:py-12 px-4 sm:px-6 max-w-6xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Order Summary */}
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-[#E8D48B] mb-4 sm:mb-6 font-ornamental">
                            {locale === 'ru' ? 'Ваш заказ' : 'Your Order'}
                        </h3>
                        <div className="bg-[#1A1517] border border-[#C9A227]/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden p-4 sm:p-6 space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id || item.productId + index} className="flex items-start gap-4 border-b border-[#C9A227]/10 pb-4 last:border-0 last:pb-0">
                                    {/* Thumbnail Image */}
                                    <Link
                                        href={`/product/${item.productSlug || item.productId}`}
                                        className="w-16 h-16 rounded-lg overflow-hidden bg-[#2A2527] flex-shrink-0 border border-[#C9A227]/20 hover:border-[#C9A227]/50 transition-colors"
                                        aria-label={locale === 'ru' ? 'Перейти к товару' : 'Go to product'}
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
                                            className="block hover:text-[#C9A227] transition-colors"
                                        >
                                            <div className="font-bold text-[#E8D48B] truncate">
                                                {typeof item.productTitle === 'object' ? item.productTitle[locale] : item.productTitle}
                                            </div>
                                        </Link>
                                        
                                        {/* Configuration details if selected */}
                                        {item.configuration && Object.keys(item.configuration).length > 0 && (
                                            <div className="text-xs text-[#F5ECD7]/50 mt-1 mb-2">
                                                {Object.values(item.configuration).join(', ')}
                                            </div>
                                        )}
                                        
                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-2 bg-[#0D0A0B]/50 rounded-lg p-1 border border-[#C9A227]/20 w-fit">
                                                <button
                                                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                    className="w-6 h-6 flex flex-shrink-0 items-center justify-center rounded-md bg-[#2A2527] text-[#C9A227] hover:bg-[#C9A227] hover:text-[#0D0A0B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    aria-label={locale === 'ru' ? 'Уменьшить количество' : 'Decrease quantity'}
                                                    disabled={item.quantity <= 1}
                                                >
                                                    -
                                                </button>
                                                <span className="w-6 text-sm text-center font-bold text-[#F5ECD7] select-none">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-6 h-6 flex flex-shrink-0 items-center justify-center rounded-md bg-[#2A2527] text-[#C9A227] hover:bg-[#C9A227] hover:text-[#0D0A0B] transition-colors"
                                                    aria-label={locale === 'ru' ? 'Увеличить количество' : 'Increase quantity'}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors p-1.5 hover:bg-red-500/10 rounded-full flex-shrink-0"
                                                title={t('cart.remove')}
                                                aria-label={locale === 'ru' ? 'Удалить товар' : 'Remove item'}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Price */}
                                    <div className="flex-shrink-0 text-right mt-1">
                                        <div className="font-semibold text-[#C9A227] font-mono whitespace-nowrap">
                                            {formatPrice(item.price * item.quantity)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 border-t border-[#C9A227]/20 space-y-2">
                                <div className="flex justify-between items-center text-base">
                                    <span className="text-[#F5ECD7]/70">{t('cart.subtotal')}:</span>
                                    <span className="text-[#E8D48B]">{formatPrice(getTotalPrice())}</span>
                                </div>

                                {getDiscount() > 0 && (
                                    <div className="flex justify-between items-center text-base">
                                        <span className="text-green-400/80">{t('cart.discount')}:</span>
                                        <span className="text-green-400">-{formatPrice(getDiscount())}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-base">
                                    <span className="text-[#F5ECD7]/70">{t('cart.shipping')}:</span>
                                    <span className={isFreeShippingEligible() ? 'text-green-400' : 'text-[#E8D48B]'}>
                                        {isFreeShippingEligible() ? t('cart.free') : formatPrice(getShippingCost())}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-xl font-bold pt-2">
                                    <span className="text-[#F5ECD7]/70">{t('cart.total')}:</span>
                                    <span className="text-[#E8D48B] text-glow-gold">{formatPrice(getFinalPrice())}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Checkout Form */}
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-[#E8D48B] mb-4 sm:mb-6 font-ornamental">
                            {locale === 'ru' ? 'Детали доставки' : 'Delivery Details'}
                        </h3>
                        <div className="bg-[#1A1517] border border-[#C9A227]/20 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-8">
                            <CheckoutForm />
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
