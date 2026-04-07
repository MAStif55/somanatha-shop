'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCartStore } from '@/store/cart-store';
import { useEffect, useState, Suspense, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { OrderRepository } from '@/lib/data';

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'unknown';

function PaymentResultContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const { locale } = useLanguage();
    const { clearCart } = useCartStore();
    const [mounted, setMounted] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
    const [checking, setChecking] = useState(true);
    const [attempts, setAttempts] = useState(0);

    const maxAttempts = 10;
    const pollIntervalMs = 3000;

    // Hydration safety
    useEffect(() => {
        setMounted(true);
    }, []);

    const checkPaymentStatus = useCallback(async () => {
        if (!orderId) {
            setPaymentStatus('unknown');
            setChecking(false);
            return;
        }

        try {
            const order = await OrderRepository.getById(orderId);

            if (!order) {
                setPaymentStatus('unknown');
                setChecking(false);
                return;
            }

            const status = order.paymentStatus as PaymentStatus;

            if (status === 'paid') {
                setPaymentStatus('paid');
                setChecking(false);
                clearCart();
                return;
            }

            if (status === 'failed' || status === 'cancelled') {
                setPaymentStatus(status);
                setChecking(false);
                return;
            }

            // Still pending — continue polling
            setAttempts((prev) => prev + 1);
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
    }, [orderId, clearCart]);

    useEffect(() => {
        if (!mounted || !orderId) return;

        // Initial check
        checkPaymentStatus();
    }, [mounted, orderId, checkPaymentStatus]);

    useEffect(() => {
        if (!mounted || !checking || paymentStatus !== 'pending') return;
        if (attempts >= maxAttempts) {
            // Stop polling after max attempts — payment might still process via webhook
            setChecking(false);
            return;
        }

        const timer = setTimeout(() => {
            checkPaymentStatus();
        }, pollIntervalMs);

        return () => clearTimeout(timer);
    }, [mounted, checking, paymentStatus, attempts, checkPaymentStatus]);

    // ---- RENDER ----

    // Payment confirmed
    if (paymentStatus === 'paid') {
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

                        <h1 className="text-3xl md:text-4xl font-ornamental text-[#E8D48B] mb-4 text-glow-gold">
                            {locale === 'ru' ? 'Оплата прошла успешно!' : 'Payment Successful!'}
                        </h1>

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

                        <p className="text-[#F5ECD7]/80 mb-8 leading-relaxed">
                            {locale === 'ru'
                                ? 'Спасибо за покупку! Ваш заказ оплачен и принят в работу. Мы свяжемся с вами для подтверждения деталей доставки.'
                                : 'Thank you for your purchase! Your order has been paid and accepted. We will contact you to confirm delivery details.'}
                        </p>

                        <div className="bg-[#1A1517]/50 border border-[#C9A227]/10 rounded-xl p-4 mb-8">
                            <p className="text-[#F5ECD7]/60 text-sm">
                                {locale === 'ru'
                                    ? 'Если у вас есть вопросы, свяжитесь с нами через Telegram или email.'
                                    : 'If you have any questions, contact us via Telegram or email.'}
                            </p>
                        </div>

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

    // Payment failed or cancelled
    if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
        return (
            <main className="min-h-screen bg-gradient-to-b from-[#0D0A0B] via-[#1A1517] to-[#0D0A0B] flex flex-col">
                <Header />
                <section className="flex-1 flex items-center justify-center py-16 px-6">
                    <div className="max-w-lg w-full text-center">
                        {/* Error Icon */}
                        <div className="mb-8">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-ornamental text-red-400 mb-4">
                            {locale === 'ru'
                                ? (paymentStatus === 'cancelled' ? 'Оплата отменена' : 'Ошибка оплаты')
                                : (paymentStatus === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed')}
                        </h1>

                        <p className="text-[#F5ECD7]/80 mb-8 leading-relaxed">
                            {locale === 'ru'
                                ? 'К сожалению, оплата не прошла. Вы можете попробовать снова или связаться с нами для помощи.'
                                : 'Unfortunately, the payment was not completed. You can try again or contact us for assistance.'}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/checkout"
                                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] px-8 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(201,162,39,0.4)] transition-all transform hover:-translate-y-1"
                            >
                                {locale === 'ru' ? 'Попробовать снова' : 'Try Again'}
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

    // Waiting / checking payment status
    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0D0A0B] via-[#1A1517] to-[#0D0A0B] flex flex-col">
            <Header />
            <section className="flex-1 flex items-center justify-center py-16 px-6">
                <div className="max-w-lg w-full text-center">
                    {/* Loading spinner */}
                    <div className="mb-8">
                        <div className="w-24 h-24 mx-auto border-4 border-[#C9A227]/30 border-t-[#C9A227] rounded-full animate-spin" />
                    </div>

                    <h1 className="text-3xl md:text-4xl font-ornamental text-[#E8D48B] mb-4 text-glow-gold">
                        {locale === 'ru' ? 'Проверяем оплату...' : 'Checking payment...'}
                    </h1>

                    <p className="text-[#F5ECD7]/60 mb-8 leading-relaxed">
                        {checking
                            ? (locale === 'ru'
                                ? 'Пожалуйста, подождите. Мы проверяем статус вашего платежа.'
                                : 'Please wait. We are checking your payment status.')
                            : (locale === 'ru'
                                ? 'Платёж ещё обрабатывается. Вы получите уведомление, когда оплата будет подтверждена.'
                                : 'Your payment is still being processed. You will be notified when it is confirmed.')}
                    </p>

                    {!checking && (
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/catalog"
                                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] px-8 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(201,162,39,0.4)] transition-all transform hover:-translate-y-1"
                            >
                                {locale === 'ru' ? 'Вернуться в каталог' : 'Back to Catalog'}
                            </Link>
                            <Link
                                href="/"
                                className="inline-flex items-center justify-center gap-2 border border-[#C9A227]/50 text-[#C9A227] px-8 py-3 rounded-xl font-bold hover:bg-[#C9A227]/10 transition-all"
                            >
                                {locale === 'ru' ? 'На главную' : 'Home'}
                            </Link>
                        </div>
                    )}
                </div>
            </section>
            <Footer />
        </main>
    );
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0D0A0B] flex items-center justify-center text-[#C9A227]">Loading...</div>}>
            <PaymentResultContent />
        </Suspense>
    );
}
