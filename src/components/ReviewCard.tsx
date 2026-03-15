'use client';

import { Star, Quote, ExternalLink } from 'lucide-react';
import { Review } from '@/types/review';

interface ReviewCardProps {
    review: Review;
}

import { useLanguage } from '@/contexts/LanguageContext';

export default function ReviewCard({ review }: ReviewCardProps) {
    const { locale } = useLanguage();

    return (
        <div className="bg-[#1A1517] p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-[#C9A227]/10 relative group hover:border-[#C9A227]/30 transition-colors h-full flex flex-col">
            <Quote className="absolute top-4 sm:top-6 right-4 sm:right-6 text-[#C9A227]/10 w-8 h-8 sm:w-12 sm:h-12 group-hover:text-[#C9A227]/20 transition-colors" />

            <div className="flex gap-1 mb-4 sm:mb-6">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-3 h-3 sm:w-4 sm:h-4 ${i < review.rating ? 'fill-[#C9A227] text-[#C9A227]' : 'text-[#C9A227]/20'}`}
                    />
                ))}
            </div>

            <p className="text-[#F5ECD7] mb-6 leading-relaxed font-elegant text-lg sm:text-xl flex-grow">
                "{review.content}"
            </p>

            <div className="flex items-center justify-between gap-4 mt-auto pt-4 border-t border-[#C9A227]/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A227] to-[#8B6914] flex items-center justify-center font-bold text-[#0D0A0B] shrink-0">
                        {review.author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="text-[#E8D48B] font-bold text-sm">{review.author}</h4>
                    </div>
                </div>

                {review.sourceUrl && (
                    <a
                        href={review.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border border-[#C9A227] text-[#C9A227] text-xs sm:text-sm font-medium rounded hover:bg-[#C9A227] hover:text-[#0D0A0B] transition-all flex items-center gap-2"
                    >
                        {locale === 'ru' ? 'Читать отзыв' : 'Read review'} <ExternalLink size={14} />
                    </a>
                )}
            </div>
        </div>
    );
}
