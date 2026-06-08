'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { locale } = useLanguage();
    const [status, setStatus] = useState<'idle' | 'verifying' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleVerify = async () => {
        if (!token) {
            setStatus('error');
            setErrorMessage('missing_token');
            router.push('/cabinet?error=missing_token');
            return;
        }

        setStatus('verifying');

        try {
            const res = await fetch('/api/auth/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                router.push('/cabinet');
            } else {
                setStatus('error');
                setErrorMessage(data.error || 'expired');
                router.push(`/cabinet?error=${data.error || 'expired'}`);
            }
        } catch (err) {
            console.error('Error verifying token:', err);
            setStatus('error');
            setErrorMessage('server_error');
            router.push('/cabinet?error=server_error');
        }
    };

    return (
        <main className="min-h-screen flex flex-col bg-[#0D0A0B]">
            <Header />

            <section className="flex-1 flex items-center justify-center py-16 px-6">
                <div className="max-w-md w-full text-center">
                    <div className="bg-[#1A1517]/80 backdrop-blur-sm border border-[#C9A227]/20 rounded-2xl p-8 shadow-[0_0_30px_rgba(201,162,39,0.05)] space-y-6">
                        {status === 'idle' && (
                            <>
                                <div className="w-16 h-16 mx-auto bg-[#C9A227]/10 text-[#C9A227] rounded-full flex items-center justify-center text-3xl">
                                    🔑
                                </div>
                                <h1 className="text-2xl font-bold text-[#E8D48B]">
                                    {locale === 'ru' ? 'Подтверждение входа' : 'Confirm Sign In'}
                                </h1>
                                <p className="text-[#F5ECD7]/80 text-sm leading-relaxed">
                                    {locale === 'ru'
                                        ? 'Вы почти у цели! Нажмите кнопку ниже, чтобы подтвердить вход в личный кабинет.'
                                        : 'You are almost there! Click the button below to confirm your sign-in.'}
                                </p>
                                <button
                                    onClick={handleVerify}
                                    className="w-full bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] py-3.5 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(201,162,39,0.4)] transition-all transform hover:-translate-y-1 text-center flex items-center justify-center"
                                >
                                    {locale === 'ru' ? 'Войти в кабинет' : 'Log In to Cabinet'}
                                </button>
                            </>
                        )}

                        {status === 'verifying' && (
                            <>
                                <div className="w-16 h-16 mx-auto border-4 border-[#C9A227]/20 border-t-[#C9A227] rounded-full animate-spin" />
                                <h1 className="text-2xl font-bold text-[#E8D48B]">
                                    {locale === 'ru' ? 'Выполняется вход...' : 'Verifying link...'}
                                </h1>
                                <p className="text-[#F5ECD7]/80 text-sm">
                                    {locale === 'ru'
                                        ? 'Пожалуйста, подождите. Мы подтверждаем вашу ссылку для входа.'
                                        : 'Please wait. We are validating your sign-in link.'}
                                </p>
                            </>
                        )}

                        {status === 'error' && (
                            <>
                                <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 text-2xl font-bold">
                                    ✕
                                </div>
                                <h1 className="text-2xl font-bold text-red-400">
                                    {locale === 'ru' ? 'Ошибка входа' : 'Verification Failed'}
                                </h1>
                                <p className="text-[#F5ECD7]/80 text-sm">
                                    {locale === 'ru'
                                        ? 'Ссылка недействительна или срок её действия истёк. Перенаправляем на страницу входа...'
                                        : 'The link is invalid or has expired. Redirecting to login page...'}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}

export default function CabinetVerifyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0D0A0B] text-[#E8D48B]">Loading...</div>}>
            <VerifyContent />
        </Suspense>
    );
}
