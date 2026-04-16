'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCartStore } from '@/store/cart-store';
import { useCartUIStore } from '@/store/cart-ui-store';
import { Menu, X, ShoppingBag, Home, Grid3X3, Phone } from 'lucide-react';

interface HeaderProps {
    variant?: 'transparent' | 'solid';
}

export default function Header({ variant = 'solid' }: HeaderProps) {
    const { locale, setLocale, t } = useLanguage();
    const pathname = usePathname();
    const { getTotalItems } = useCartStore();
    const { openDrawer } = useCartUIStore();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Hydration-safe: only show client-specific content after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Get total items only after mounted to prevent hydration mismatch
    const totalItems = mounted ? getTotalItems() : 0;

    // Close menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const isActive = (path: string) => {
        if (path === '/catalog') {
            return pathname.startsWith('/catalog');
        }
        return pathname === path;
    };

    const navLinks = [
        { href: '/', label: t('nav.home'), icon: Home },
        { href: '/catalog', label: t('nav.catalog'), icon: Grid3X3 },
        { href: '/about', label: t('nav.about'), icon: Phone },
    ];

    const baseClasses = variant === 'transparent'
        ? 'relative z-50 py-6'
        : 'sticky top-0 bg-gradient-to-r from-[#0D0A0B] via-[#1A1517] to-[#0D0A0B] border-b border-[#C9A227]/20 py-4 z-50';

    return (
        <>
            <header className={baseClasses}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 sm:gap-4 group">
                        <Image
                            src="/logo.png"
                            alt="Somanatha"
                            width={48}
                            height={60}
                            className="w-8 h-10 sm:w-12 sm:h-[60px] transform group-hover:scale-110 transition-transform duration-300 invert"
                        />
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-ornamental text-[#E8D48B] tracking-wide group-hover:text-glow-gold transition-all">
                                {locale === 'ru' ? 'Соманатха' : 'Somanatha'}
                            </h1>
                            <p className="hidden sm:block text-xs text-[#C9A227]/80 uppercase tracking-[0.2em]">
                                {locale === 'ru' ? 'Ведический магазин' : 'Vedic Shop'}
                            </p>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`relative font-medium transition-all duration-300 py-2 ${isActive(link.href)
                                    ? 'text-[#E8D48B]'
                                    : 'text-[#F5ECD7]/80 hover:text-[#E8D48B]'
                                    }`}
                            >
                                {link.label}
                                {isActive(link.href) && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#C9A227] to-transparent"></span>
                                )}
                            </Link>
                        ))}

                        {/* Cart */}
                        <button
                            onClick={openDrawer}
                            className={`flex items-center gap-2 font-medium transition-all duration-300 relative text-[#F5ECD7]/80 hover:text-[#E8D48B]`}
                            aria-label={locale === 'ru' ? 'Открыть корзину' : 'Open cart'}
                        >
                            <div className="relative">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                {totalItems > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-[#0D0A0B]">
                                        {totalItems}
                                    </span>
                                )}
                            </div>
                            {t('nav.cart')}
                        </button>

                        {/* Language Toggle - Metallic Style */}
                        <button
                            onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}
                            className="px-4 py-2 rounded-lg border border-[#C9A227]/50 text-[#C9A227] text-sm font-semibold
                                       bg-gradient-to-b from-[#C9A227]/10 to-transparent
                                       hover:from-[#C9A227]/20 hover:border-[#C9A227]
                                       hover:shadow-[0_0_15px_rgba(201,162,39,0.3)]
                                       transition-all duration-300"
                        >
                            {locale === 'ru' ? 'EN' : 'RU'}
                        </button>
                    </nav>

                    {/* Mobile Menu Controls */}
                    <div className="md:hidden flex items-center gap-3">
                        {/* Cart Icon */}
                        <button onClick={openDrawer} className="text-[#E8D48B] relative p-2" aria-label={locale === 'ru' ? 'Открыть корзину' : 'Open cart'}>
                            <div className="relative">
                                <ShoppingBag className="w-6 h-6" />
                                {totalItems > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-[#0D0A0B]">
                                        {totalItems}
                                    </span>
                                )}
                            </div>
                        </button>

                        {/* Hamburger Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 rounded-lg border border-[#C9A227]/30 text-[#E8D48B] hover:bg-[#C9A227]/10 hover:border-[#C9A227]/60 transition-all"
                            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* Mobile Menu Slide-in Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-[280px] max-w-[85vw] bg-gradient-to-b from-[#1A1517] to-[#0D0A0B] border-l border-[#C9A227]/30 z-50 md:hidden transform transition-transform duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Menu Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#C9A227]/20">
                    <span className="text-[#E8D48B] font-ornamental text-lg">
                        {locale === 'ru' ? 'Меню' : 'Menu'}
                    </span>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 rounded-lg text-[#F5ECD7]/60 hover:text-[#E8D48B] hover:bg-[#C9A227]/10 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="p-4 space-y-2">
                    {navLinks.map((link) => {
                        const IconComponent = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${isActive(link.href)
                                    ? 'bg-gradient-to-r from-[#C9A227]/20 to-transparent text-[#E8D48B] border-l-2 border-[#C9A227]'
                                    : 'text-[#F5ECD7]/80 hover:bg-[#C9A227]/10 hover:text-[#E8D48B]'
                                    }`}
                            >
                                <IconComponent className="w-5 h-5" />
                                <span className="font-medium">{link.label}</span>
                            </Link>
                        );
                    })}

                    {/* Cart Link in Menu */}
                    <Link
                        href="/cart"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${isActive('/cart')
                            ? 'bg-gradient-to-r from-[#C9A227]/20 to-transparent text-[#E8D48B] border-l-2 border-[#C9A227]'
                            : 'text-[#F5ECD7]/80 hover:bg-[#C9A227]/10 hover:text-[#E8D48B]'
                            }`}
                    >
                        <div className="relative">
                            <ShoppingBag className="w-5 h-5" />
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {totalItems}
                                </span>
                            )}
                        </div>
                        <span className="font-medium">{t('nav.cart')}</span>
                        {totalItems > 0 && (
                            <span className="ml-auto text-xs text-[#C9A227] bg-[#C9A227]/10 px-2 py-0.5 rounded-full">
                                {totalItems}
                            </span>
                        )}
                    </Link>
                </nav>

                {/* Divider */}
                <div className="mx-4 my-4 h-px bg-gradient-to-r from-transparent via-[#C9A227]/30 to-transparent" />

                {/* Language Toggle */}
                <div className="px-4">
                    <button
                        onClick={() => {
                            setLocale(locale === 'ru' ? 'en' : 'ru');
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#C9A227]/30 text-[#C9A227] font-semibold
                                   bg-gradient-to-b from-[#C9A227]/10 to-transparent
                                   hover:from-[#C9A227]/20 hover:border-[#C9A227]
                                   transition-all"
                    >
                        <span className="text-lg">{locale === 'ru' ? '🇬🇧' : '🇷🇺'}</span>
                        <span>{locale === 'ru' ? 'English' : 'Русский'}</span>
                    </button>
                </div>

                {/* Bottom Decorative Element */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    <div className="divider-ornamental opacity-50">
                        <span className="text-[#C9A227]/50 text-xl">☸</span>
                    </div>
                </div>
            </div>
        </>
    );
}
