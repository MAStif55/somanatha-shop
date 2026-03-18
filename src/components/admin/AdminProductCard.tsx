'use client';

import { Product, getCardImageUrl } from '@/types/product';
import Link from 'next/link';
import { Copy, ExternalLink, Trash2, Check } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

interface AdminProductCardProps {
    product: Product;
    locale: 'en' | 'ru';
    selected: boolean;
    onToggleSelect: (id: string, e: React.MouseEvent) => void;
    onDuplicate: (product: Product, e: React.MouseEvent) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
}

export function AdminProductCard({
    product,
    locale,
    selected,
    onToggleSelect,
    onDuplicate,
    onDelete
}: AdminProductCardProps) {
    return (
        <Link
            href={`/admin/products/edit?id=${product.id}`}
            className={`group relative flex flex-col bg-white rounded-xl border transition-all duration-200 hover:shadow-lg ${selected
                ? 'border-primary ring-2 ring-primary ring-opacity-50'
                : 'border-gray-200 hover:border-primary/50'
                }`}
        >
            {/* Selection Checkbox (Absolute Top Left) */}
            <div
                className="absolute top-3 left-3 z-10"
                onClick={(e) => onToggleSelect(product.id, e)}
            >
                <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${selected
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white/80 border-gray-300 hover:border-primary text-transparent'
                    }`}>
                    <Check size={14} strokeWidth={3} />
                </div>
            </div>

            {/* Image Area */}
            <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-gray-100">
                {product.images?.[0] ? (
                    <img
                        src={getCardImageUrl(product.images[0])}
                        alt={product.title[locale]}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                        No Image
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex flex-col flex-1 p-4">
                <div className="mb-2">
                    <h3 className="font-heading font-bold text-lg text-gray-900 line-clamp-1" title={product.title[locale]}>
                        {product.title[locale]}
                    </h3>
                    <p className="text-sm text-gray-600 font-medium line-clamp-2 min-h-[2.5em]">
                        {product.description[locale]}
                    </p>
                </div>

                <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="font-bold text-gray-900 text-lg">
                        {formatCurrency(product.basePrice)}
                    </span>

                    {/* Quick Actions (Prevent bubbling to Link) */}
                    <div className="flex space-x-1" onClick={(e) => e.preventDefault()}>
                        <a
                            href={`/pack?id=${product.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors"
                            title="View Live"
                        >
                            <ExternalLink size={16} />
                        </a>
                        <button
                            onClick={(e) => onDuplicate(product, e)}
                            className="p-2 text-gray-400 hover:text-indigo-500 rounded-full hover:bg-indigo-50 transition-colors"
                            title="Duplicate"
                        >
                            <Copy size={16} />
                        </button>
                        <button
                            onClick={(e) => onDelete(product.id, e)}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
