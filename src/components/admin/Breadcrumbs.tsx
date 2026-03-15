'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

const pathLabels: Record<string, { en: string; ru: string }> = {
    'admin': { en: 'Admin', ru: 'Админ' },
    'products': { en: 'Products', ru: 'Товары' },
    'calculator': { en: 'Calculator', ru: 'Калькулятор' },
    'orders': { en: 'Orders', ru: 'Заказы' },
    'settings': { en: 'Settings', ru: 'Настройки' },
    'new': { en: 'New', ru: 'Новый' },
    'edit': { en: 'Edit', ru: 'Редактирование' },
};

export default function Breadcrumbs() {
    const pathname = usePathname();
    const { locale } = useTranslation();

    const segments = pathname?.split('/').filter(Boolean) || [];

    if (segments.length <= 1) return null; // Don't show on /admin root

    return (
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link href="/admin" className="hover:text-primary transition-colors">
                <Home size={16} />
            </Link>

            {segments.map((segment, index) => {
                const path = '/' + segments.slice(0, index + 1).join('/');
                const isLast = index === segments.length - 1;
                const label = pathLabels[segment]?.[locale as 'en' | 'ru'] || segment;

                return (
                    <span key={path} className="flex items-center space-x-2">
                        <ChevronRight size={14} className="text-gray-400" />
                        {isLast ? (
                            <span className="font-bold text-gray-900">{label}</span>
                        ) : (
                            <Link href={path} className="hover:text-primary transition-colors text-gray-700">
                                {label}
                            </Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
