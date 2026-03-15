'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { API } from '@/lib/config';

export default function AboutPage() {
    const { locale } = useLanguage();
    const [formData, setFormData] = useState({
        phone: '',
        telegram: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(false);
        try {
            const res = await fetch(API.SUBMIT_FEEDBACK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: formData.phone,
                    telegram: formData.telegram || null,
                    message: formData.message,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSubmitted(true);
                setFormData({ phone: '', telegram: '', message: '' });
            } else {
                setSubmitError(true);
            }
        } catch {
            setSubmitError(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#0D0A0B]">
            <Header />

            {/* Hero Banner */}
            <section className="py-12 sm:py-20 px-4 sm:px-6 text-center bg-hero-premium">
                <div className="divider-ornamental mb-4 sm:mb-6">
                    <span className="text-[#C9A227] text-2xl sm:text-3xl">☸</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-ornamental text-[#E8D48B] text-glow-gold mb-4">
                    {locale === 'ru' ? 'Контакты' : 'Contact Us'}
                </h1>
            </section>

            {/* About Section */}
            <section className="py-16 px-6 bg-gradient-to-b from-[#1A1517] to-[#0D0A0B]">
                <div className="max-w-4xl mx-auto">


                    {/* Values */}
                    <div className="mb-12 sm:mb-16">
                        <div className="flex items-center gap-3 sm:gap-4 mb-6">
                            <span className="text-3xl sm:text-4xl">💎</span>
                            <h2 className="text-xl sm:text-2xl font-elegant font-bold text-[#E8D48B]">
                                {locale === 'ru' ? 'Наши Ценности' : 'Our Values'}
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                            {[
                                { icon: '🙏', titleEn: 'Authenticity', titleRu: 'Подлинность', descEn: 'Only genuine items crafted according to sacred traditions', descRu: 'Только подлинные изделия по священным традициям' },
                                { icon: '✨', titleEn: 'Quality', titleRu: 'Качество', descEn: 'Premium materials and meticulous attention to detail', descRu: 'Премиальные материалы и внимание к деталям' },
                                { icon: '❤️', titleEn: 'Devotion', titleRu: 'Преданность', descEn: 'Deep respect for the spiritual significance', descRu: 'Глубокое уважение к духовному значению' }
                            ].map((value, i) => (
                                <div key={i} className="card-premium p-4 sm:p-6 text-center">
                                    <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{value.icon}</div>
                                    <h4 className="text-base sm:text-lg font-bold text-[#2D1B1F] mb-2">{locale === 'ru' ? value.titleRu : value.titleEn}</h4>
                                    <p className="text-[#4A2C32] text-xs sm:text-sm">{locale === 'ru' ? value.descRu : value.descEn}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-12 sm:py-16 px-4 sm:px-6 bg-[#0D0A0B] bg-sacred-pattern">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8 sm:mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-ornamental text-[#E8D48B] text-glow-gold">
                            {locale === 'ru' ? 'Связаться с Нами' : 'Contact Us'}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                        {/* Messenger Buttons */}
                        <div className="flex flex-col gap-5 justify-center">
                            <a
                                href="https://t.me/Trubitsina_Elena_Astrolog"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-5 p-6 rounded-xl border border-[#C9A227]/30 bg-[#1A1517]/80 hover:border-[#C9A227]/60 hover:bg-[#1A1517] transition-all group"
                            >
                                <div className="w-14 h-14 bg-[#229ED9]/15 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#229ED9]" fill="currentColor">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#E8D48B] text-lg group-hover:text-[#C9A227] transition-colors">Telegram</h4>
                                    <p className="text-[#F5ECD7]/60 text-sm">{locale === 'ru' ? 'Напишите нам в Telegram' : 'Message us on Telegram'}</p>
                                </div>
                                <svg className="w-5 h-5 text-[#C9A227]/50 ml-auto group-hover:text-[#C9A227] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </a>

                            <a
                                href="https://max.ru/u/f9LHodD0cOIistNNtQFWq4OLPx_ZPYrqvTyLMwLrRY0P9hHA7Zd06uRLwCg"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-5 p-6 rounded-xl border border-[#C9A227]/30 bg-[#1A1517]/80 hover:border-[#C9A227]/60 hover:bg-[#1A1517] transition-all group"
                            >
                                <div className="w-14 h-14 bg-[#FF6600]/15 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#FF6600]" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#E8D48B] text-lg group-hover:text-[#C9A227] transition-colors">Max</h4>
                                    <p className="text-[#F5ECD7]/60 text-sm">{locale === 'ru' ? 'Напишите нам в Max' : 'Message us on Max'}</p>
                                </div>
                                <svg className="w-5 h-5 text-[#C9A227]/50 ml-auto group-hover:text-[#C9A227] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </a>
                        </div>

                        {/* Contact Form */}
                        <div>
                            {submitted ? (
                                <div className="card-premium p-8 text-center">
                                    <div className="text-5xl mb-4">✅</div>
                                    <h4 className="text-xl font-bold text-[#2D1B1F] mb-2">
                                        {locale === 'ru' ? 'Сообщение отправлено!' : 'Message Sent!'}
                                    </h4>
                                    <p className="text-[#4A2C32] mb-4">{locale === 'ru' ? 'Мы свяжемся с вами в ближайшее время.' : 'We will get back to you soon.'}</p>
                                    <button onClick={() => setSubmitted(false)} className="text-[#8B6914] hover:underline">
                                        {locale === 'ru' ? 'Отправить ещё' : 'Send another message'}
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="card-premium p-8 space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-[#2D1B1F] mb-2">{locale === 'ru' ? 'Телефон' : 'Phone'} *</label>
                                        <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-3 border border-[#C9A227]/30 rounded-lg bg-[#FAF6ED] text-[#2D1B1F] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                                            placeholder={locale === 'ru' ? '+7 (___) ___-__-__' : '+1 (___) ___-____'} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#2D1B1F] mb-2">Telegram {locale === 'ru' ? '(необязательно)' : '(optional)'}</label>
                                        <input type="text" value={formData.telegram} onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                                            className="w-full px-4 py-3 border border-[#C9A227]/30 rounded-lg bg-[#FAF6ED] text-[#2D1B1F] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                                            placeholder="@username" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#2D1B1F] mb-2">{locale === 'ru' ? 'Сообщение' : 'Message'} *</label>
                                        <textarea required rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            className="w-full px-4 py-3 border border-[#C9A227]/30 rounded-lg bg-[#FAF6ED] text-[#2D1B1F] focus:outline-none focus:ring-2 focus:ring-[#C9A227] resize-none"
                                            placeholder={locale === 'ru' ? 'Введите сообщение...' : 'Enter your message...'} />
                                    </div>
                                    {submitError && (
                                        <div className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg">
                                            {locale === 'ru' ? 'Ошибка отправки. Попробуйте ещё раз.' : 'Failed to send. Please try again.'}
                                        </div>
                                    )}
                                    <button type="submit" disabled={isSubmitting} className="w-full btn-metallic-gold py-4 rounded-lg text-lg disabled:opacity-60">
                                        {isSubmitting ? (locale === 'ru' ? 'Отправка...' : 'Sending...') : (locale === 'ru' ? 'Отправить' : 'Send Message')}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
