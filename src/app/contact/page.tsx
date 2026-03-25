'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail, MessageCircle, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { API } from '@/lib/config';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { defaultSettings } from '@/types/settings';

export default function ContactPage() {
    const { locale } = useLanguage();
    const [phone, setPhone] = useState('');
    const [telegram, setTelegram] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const { settings } = useStoreSettings();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('idle');

        try {
            const res = await fetch(API.SUBMIT_FEEDBACK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, telegram: telegram || null, message }),
            });

            const data = await res.json();

            if (data.success) {
                setStatus('success');
                setPhone('');
                setTelegram('');
                setMessage('');
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#FAF9F6] flex flex-col">
            <Header />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-ornamental text-[#2D1B1F] mb-2 text-center">
                    {locale === 'ru' ? 'Свяжитесь с Нами' : 'Contact Us'}
                </h1>
                <div className="w-24 h-1 bg-[#C9A227] mx-auto rounded-full mb-8 sm:mb-12"></div>

                <div className="bg-white rounded-2xl shadow-lg border border-[#C9A227]/20 p-6 sm:p-8 md:p-12">
                    <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                        <div>
                            <h2 className="text-xl font-bold text-[#8B4513] mb-6 uppercase tracking-wider">
                                {locale === 'ru' ? 'Наши Контакты' : 'Get in Touch'}
                            </h2>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-[#F5ECD7] rounded-full text-[#8B4513] flex-shrink-0">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#2D1B1F]">Email</h3>
                                        <p className="text-[#666]">{settings.contact.email || defaultSettings.contact.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-[#F5ECD7] rounded-full text-[#8B4513] flex-shrink-0">
                                        <MessageCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#2D1B1F]">WhatsApp / Telegram</h3>
                                        <p className="text-[#666]">{settings.contact.phone || defaultSettings.contact.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-[#F5ECD7] rounded-full text-[#8B4513] flex-shrink-0">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#2D1B1F]">{locale === 'ru' ? 'Мастерская' : 'Workshop'}</h3>
                                        <p className="text-[#666]" style={{ whiteSpace: 'pre-line' }}>
                                            {settings.contact.address || defaultSettings.contact.address}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-[#8B4513] mb-6 uppercase tracking-wider">
                                {locale === 'ru' ? 'Напишите Нам' : 'Send a Message'}
                            </h2>

                            {status === 'success' ? (
                                <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                                    <div className="p-4 bg-green-50 rounded-full">
                                        <CheckCircle size={48} className="text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-[#2D1B1F] mb-1">
                                            {locale === 'ru' ? 'Сообщение отправлено!' : 'Message sent!'}
                                        </p>
                                        <p className="text-[#666] text-sm">
                                            {locale === 'ru'
                                                ? 'Мы свяжемся с вами в ближайшее время.'
                                                : 'We will get back to you shortly.'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStatus('idle')}
                                        className="mt-2 text-sm text-[#8B4513] underline hover:no-underline"
                                    >
                                        {locale === 'ru' ? 'Отправить ещё' : 'Send another'}
                                    </button>
                                </div>
                            ) : (
                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    <div>
                                        <label className="block text-sm text-[#666] mb-1">
                                            {locale === 'ru' ? 'Телефон' : 'Phone'} *
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder={locale === 'ru' ? '+7 (___) ___-__-__' : '+1 (___) ___-____'}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#C9A227] outline-none transition-colors text-[#333]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[#666] mb-1">
                                            Telegram {locale === 'ru' ? '(необязательно)' : '(optional)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={telegram}
                                            onChange={e => setTelegram(e.target.value)}
                                            placeholder="@username"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#C9A227] outline-none transition-colors text-[#333]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[#666] mb-1">
                                            {locale === 'ru' ? 'Сообщение' : 'Message'} *
                                        </label>
                                        <textarea
                                            rows={4}
                                            required
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            placeholder={locale === 'ru' ? 'Ваше сообщение...' : 'Your message...'}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#C9A227] outline-none transition-colors resize-none text-[#333]"
                                        ></textarea>
                                    </div>

                                    {status === 'error' && (
                                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
                                            <AlertCircle size={18} />
                                            <span>
                                                {locale === 'ru'
                                                    ? 'Ошибка отправки. Попробуйте ещё раз.'
                                                    : 'Failed to send. Please try again.'}
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full btn-metallic-gold py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                {locale === 'ru' ? 'Отправить' : 'Send Message'}
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
