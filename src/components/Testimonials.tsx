'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Quote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ReviewRepository } from '@/lib/data';
import { Review } from '@/types/review';
import ReviewCard from '@/components/ReviewCard';

export default function Testimonials() {
    const { locale } = useLanguage();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const reviewsData = await ReviewRepository.getLatest(6);
                setReviews(reviewsData);
            } catch (error) {
                console.error('Error fetching reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, []);

    if (loading) {
        return (
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#0D0A0B] border-t border-[#C9A227]/10 relative">
                <div className="max-w-6xl mx-auto text-center text-[#F5ECD7]/60">
                    Loading reviews...
                </div>
            </section>
        );
    }

    if (reviews.length === 0) {
        return null;
    }

    return (
        <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#0D0A0B] border-t border-[#C9A227]/10 relative">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10 sm:mb-16">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-ornamental text-[#F5ECD7] mb-4">
                        {locale === 'ru' ? 'Отзывы' : 'Reviews'}
                    </h2>
                    <div className="w-24 h-1 bg-[#C9A227] mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {reviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))}
                </div>
            </div>
        </section>
    );
}

