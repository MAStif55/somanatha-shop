'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Product } from '@/types/product';
import { Info, Ruler, Sparkles, HeartHandshake } from 'lucide-react';

interface ProductTabsProps {
    product: Product;
}

export default function ProductTabs({ product }: ProductTabsProps) {
    const { locale } = useLanguage();
    const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'care' | 'meaning'>('desc');

    const tabs = [
        { id: 'desc', label: { en: 'Description', ru: 'Описание' }, icon: <Info size={18} /> },
        { id: 'specs', label: { en: 'Specifications', ru: 'Характеристики' }, icon: <Ruler size={18} /> },
        { id: 'meaning', label: { en: 'Meaning', ru: 'Значение' }, icon: <Sparkles size={18} /> },
        { id: 'care', label: { en: 'Care', ru: 'Уход' }, icon: <HeartHandshake size={18} /> },
    ] as const;

    return (
        <div className="mt-12 bg-white rounded-2xl p-6 shadow-sm border border-[#E8D48B]/20">
            {/* Tabs Header */}
            <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === tab.id
                            ? 'bg-[#2D1B1F] text-[#E8D48B] shadow-md'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-[#8B4513]'
                            }`}
                    >
                        {tab.icon}
                        {tab.label[locale]}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px] text-[#666] leading-relaxed animate-fade-in">
                {activeTab === 'desc' && (
                    <div className="prose prose-stone max-w-none">
                        <p className="whitespace-pre-wrap">{product.description[locale]}</p>
                    </div>
                )}

                {activeTab === 'specs' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-900">{locale === 'ru' ? 'Категория' : 'Category'}</span>
                            <span className="capitalize">{product.category}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-900">{locale === 'ru' ? 'Базовая цена' : 'Base Price'}</span>
                            <span>{product.basePrice} THB</span>
                        </div>
                        {/* Placeholder for future specific attributes */}
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-900">{locale === 'ru' ? 'Материал' : 'Material'}</span>
                            <span>{locale === 'ru' ? 'Медь / Золото 24К' : 'Copper / 24K Gold'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-900">{locale === 'ru' ? 'Освящение' : 'Consecration'}</span>
                            <span>{locale === 'ru' ? 'Ведическая Пуджа' : 'Vedic Puja'}</span>
                        </div>
                    </div>
                )}

                {activeTab === 'meaning' && (
                    <div className="space-y-4">
                        <p>
                            {locale === 'ru'
                                ? 'Этот артефакт создан в соответствии с древними ведическими текстами. Геометрия янтры резонирует с определенными космическими энергиями, принося гармонию и защиту в пространство.'
                                : 'This artifact is created in accordance with ancient Vedic texts. The geometry of the Yantra resonates with specific cosmic energies, bringing harmony and protection to the space.'}
                        </p>
                        <div className="p-4 bg-[#F5ECD7]/30 rounded-xl border border-[#C9A227]/20 italic text-[#8B4513]">
                            {locale === 'ru'
                                ? '"Янтра — это физическое воплощение божественной звуковой вибрации (Мантры)."'
                                : '"The Yantra is the physical embodiment of the divine sound vibration (Mantra)."'}
                        </div>
                    </div>
                )}

                {activeTab === 'care' && (
                    <ul className="list-disc pl-5 space-y-2">
                        <li>{locale === 'ru' ? 'Протирайте мягкой чистой тканью.' : 'Wipe with a soft clean cloth.'}</li>
                        <li>{locale === 'ru' ? 'Избегайте попадания агрессивных химикатов.' : 'Avoid contact with harsh chemicals.'}</li>
                        <li>{locale === 'ru' ? 'Рекомендуется периодически подносить благовония.' : 'It is recommended to offer incense periodically.'}</li>
                        <li>{locale === 'ru' ? 'Относитесь с уважением как к священному объекту.' : 'Treat with respect as a sacred object.'}</li>
                    </ul>
                )}
            </div>
        </div>
    );
}
