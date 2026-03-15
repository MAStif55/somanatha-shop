'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
    const { locale, t } = useLanguage();

    const navLinks = [
        { href: '/catalog', label: t('nav.catalog') },
        { href: '/about', label: t('nav.about') },
        { href: '/shipping', label: t('nav.shipping') },
        { href: '/offer', label: t('nav.offer') },
    ];

    return (
        <footer className="bg-gradient-to-b from-[#1A1517] to-[#0D0A0B] border-t border-[#C9A227]/20 py-8 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-sacred-pattern opacity-30"></div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 mb-8 sm:mb-10">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-4 group">
                        <Image
                            src="/logo.png"
                            alt="Somanatha"
                            width={40}
                            height={50}
                            className="transform group-hover:scale-110 transition-transform invert"
                        />
                        <div>
                            <h2 className="text-2xl font-ornamental text-[#E8D48B] group-hover:text-glow-gold transition-all">
                                {locale === 'ru' ? 'Соманатха' : 'Somanatha'}
                            </h2>
                            <p className="text-xs text-[#C9A227]/70 uppercase tracking-[0.2em]">
                                {locale === 'ru' ? 'Ведический магазин' : 'Vedic Store'}
                            </p>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex flex-wrap justify-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-[#F5ECD7]/60 hover:text-[#E8D48B] transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Divider */}
                <div className="divider-ornamental my-8 opacity-50">
                    <span className="text-[#C9A227]/50">☸</span>
                </div>

                {/* Copyright */}
                <div className="text-center text-sm text-[#F5ECD7]/40">
                    © 2026 {locale === 'ru' ? 'Соманатха' : 'Somanatha'}. {locale === 'ru' ? 'Все права защищены.' : 'All rights reserved.'}
                </div>
            </div>
        </footer>
    );
}
