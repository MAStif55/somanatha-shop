'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCartStore } from '@/store/cart-store';
import { useEffect, useState, Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function OrderSuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const paymentMethod = searchParams.get('method');
    const { locale } = useLanguage();
    const { clearCart } = useCartStore();
    const [mounted, setMounted] = useState(false);

    // Hydration safety
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && orderId) {
            clearCart();
        }
    }, [orderId, clearCart, mounted]);

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0D0A0B] via-[#1A1517] to-[#0D0A0B] flex flex-col">
            <Header />

            <section className="flex-1 flex items-center justify-center py-16 px-6">
                <div className="max-w-lg w-full text-center">
                    {/* Success Icon */}
                    <div className="mb-8">
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#C9A227] to-[#8B7D4B] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(201,162,39,0.4)]">
                            <svg className="w-12 h-12 text-[#0D0A0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl font-ornamental text-[#E8D48B] mb-4 text-glow-gold">
                        {locale === 'ru' ? 'Заказ оформлен!' : 'Order Placed!'}
                    </h1>

                    {/* Order Number */}
                    {orderId && (
                        <div className="bg-[#1A1517] border border-[#C9A227]/30 rounded-xl p-6 mb-8">
                            <p className="text-[#F5ECD7]/70 text-sm mb-2">
                                {locale === 'ru' ? 'Номер заказа:' : 'Order Number:'}
                            </p>
                            <p className="text-2xl font-mono text-[#C9A227] font-bold tracking-wider">
                                #{orderId.slice(-8).toUpperCase()}
                            </p>
                        </div>
                    )}

                    {/* Message */}
                    <p className="text-[#F5ECD7]/80 mb-4 leading-relaxed">
                        {locale === 'ru'
                            ? 'Спасибо за ваш заказ! Мы свяжемся с вами в ближайшее время для подтверждения деталей доставки.'
                            : 'Thank you for your order! We will contact you shortly to confirm delivery details.'}
                    </p>

                    {/* Bank Transfer Info */}
                    {paymentMethod === 'bank_transfer' && (
                        <div className="bg-[#C9A227]/10 border border-[#C9A227]/30 rounded-xl p-5 mb-8 text-left">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">🏦</span>
                                <h3 className="font-bold text-[#E8D48B]">
                                    {locale === 'ru' ? 'Оплата переводом' : 'Bank Transfer'}
                                </h3>
                            </div>
                            <p className="text-[#F5ECD7]/70 text-sm leading-relaxed">
                                {locale === 'ru'
                                    ? 'Менеджер свяжется с вами и предоставит реквизиты для оплаты. После получения оплаты заказ будет обработан.'
                                    : 'A manager will contact you with payment details. Your order will be processed after payment is received.'}
                            </p>
                        </div>
                    )}

                    {/* Contact Info */}
                    <div className="bg-[#1A1517]/50 border border-[#C9A227]/10 rounded-xl p-4 mb-8">
                        <p className="text-[#F5ECD7]/60 text-sm">
                            {locale === 'ru'
                                ? 'Если у вас есть вопросы, свяжитесь с нами через Telegram или email.'
                                : 'If you have any questions, contact us via Telegram or email.'}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/catalog"
                            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] px-8 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(201,162,39,0.4)] transition-all transform hover:-translate-y-1"
                        >
                            {locale === 'ru' ? 'Продолжить покупки' : 'Continue Shopping'}
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 border border-[#C9A227]/50 text-[#C9A227] px-8 py-3 rounded-xl font-bold hover:bg-[#C9A227]/10 transition-all"
                        >
                            {locale === 'ru' ? 'На главную' : 'Home'}
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}

export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0D0A0B] flex items-center justify-center text-[#C9A227]">Loading...</div>}>
            <OrderSuccessContent />
        </Suspense>
    );
}
