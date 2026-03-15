'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export function AddProductCard() {
    const { t } = useTranslation();

    return (
        <Link
            href="/admin/products/new"
            className="group flex flex-col items-center justify-center min-h-[300px] h-full bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-primary hover:bg-gray-50 transition-all duration-200"
        >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Plus size={32} className="text-primary" />
            </div>
            <span className="font-bold text-lg text-gray-800 group-hover:text-primary transition-colors">
                {t('admin.add_new_pack')}
            </span>
        </Link>
    );
}
