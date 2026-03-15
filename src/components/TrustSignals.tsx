'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Hammer, Calendar, Package } from 'lucide-react';

export default function TrustSignals() {
    const { locale } = useLanguage();

    const signals = [
        {
            icon: <Hammer className="w-8 h-8 text-[#C9A227]" />,
            title: { en: 'Premium Materials', ru: 'Премиум Материалы' },
            desc: { en: 'High-quality copper, brass, and steel', ru: 'Высококачественная медь, латунь и сталь' }
        },
        {
            icon: <Calendar className="w-8 h-8 text-[#C9A227]" />,
            title: { en: 'Auspicious Timing', ru: 'Благоприятное Время' },
            desc: { en: 'Manufactured on auspicious days', ru: 'Изготовлено в благоприятные дни' }
        },
        {
            icon: <Package className="w-8 h-8 text-[#C9A227]" />,
            title: { en: 'Reliable Packaging', ru: 'Надежная Упаковка' },
            desc: { en: 'Ensures safety during transit', ru: 'Гарантия сохранности при доставке' }
        }
    ];

    return (
        <section className="bg-[#1A1517] border-b border-[#C9A227]/10 relative z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    {signals.map((item, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 group text-center sm:text-left md:justify-start">
                            <div className="p-3 bg-[#2D1B1F] rounded-full border border-[#C9A227]/20 group-hover:border-[#C9A227]/50 transition-colors shadow-lg shrink-0">
                                {item.icon}
                            </div>
                            <div>
                                <h3 className="text-[#E8D48B] font-bold text-sm uppercase tracking-wider mb-1">
                                    {item.title[locale]}
                                </h3>
                                <p className="text-xs text-[#F5ECD7]/60">
                                    {item.desc[locale]}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
