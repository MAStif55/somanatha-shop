'use client';

import { useState, useEffect } from 'react';
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
    const { items, getTotalPrice, getDiscount, getFinalPrice, getShippingCost, isFreeShippingEligible, setShippingConfig } = useCartStore();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const { settings } = useStoreSettings();

    // Sync shipping config from Firestore settings into cart store
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
                                <div key={item.productId + index} className="flex justify-between items-center border-b border-[#C9A227]/10 pb-4 last:border-0 last:pb-0">
                                    <div>
                                        <div className="font-bold text-[#E8D48B]">
                                            {typeof item.productTitle === 'object' ? item.productTitle[locale] : item.productTitle}
                                        </div>
                                        <div className="text-sm text-[#F5ECD7]/50">
                                            x{item.quantity}
                                        </div>
                                    </div>
                                    <div className="font-semibold text-[#C9A227] font-mono">
                                        {formatPrice(item.price * item.quantity)}
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
