'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Review } from '@/types/review';
import { Plus, Pencil, Trash2, Star, ExternalLink } from 'lucide-react';
import ReviewForm from '@/components/admin/ReviewForm';
import { useTranslation } from "@/contexts/LanguageContext";

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReview, setEditingReview] = useState<Review | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { locale } = useTranslation();

    useEffect(() => {
        const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reviewsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Review[];
            setReviews(reviewsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching reviews:", err);
            setError("Failed to load reviews. Check console for details.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);


    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this review?')) {
            try {
                await deleteDoc(doc(db, 'reviews', id));
            } catch (error) {
                console.error('Error deleting review:', error);
                alert('Error deleting review');
            }
        }
    };

    const handleEdit = (review: Review) => {
        setEditingReview(review);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingReview(null);
        setIsFormOpen(true);
    };

    const t = {
        title: locale === 'ru' ? 'Управление отзывами' : 'Review Management',
        add: locale === 'ru' ? 'Добавить отзыв' : 'Add Review',
        loading: locale === 'ru' ? 'Загрузка отзывов...' : 'Loading reviews...',
        error: locale === 'ru' ? 'Не удалось загрузить отзывы' : 'Failed to load reviews',
        noReviews: locale === 'ru' ? 'Отзывов пока нет. Добавьте первый!' : 'No reviews found. Add one to get started!',
        table: {
            author: locale === 'ru' ? 'Автор' : 'Author',
            rating: locale === 'ru' ? 'Оценка' : 'Rating',
            content: locale === 'ru' ? 'Текст' : 'Content',
            source: locale === 'ru' ? 'Источник' : 'Source',
            actions: locale === 'ru' ? 'Действия' : 'Actions',
            link: locale === 'ru' ? 'Сcылка' : 'Link',
        },
        deleteConfirm: locale === 'ru' ? 'Вы уверены, что хотите удалить этот отзыв?' : 'Are you sure you want to delete this review?',
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-600">{t.loading}</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="space-y-6 text-gray-900">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    {t.title}
                </h1>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-4 py-2 bg-[#C9A227] text-black font-semibold rounded-lg hover:bg-[#B59122] transition-colors"
                >
                    <Plus size={20} />
                    {t.add}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">{t.table.author}</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">{t.table.rating}</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">{t.table.content}</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">{t.table.source}</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-24">{t.table.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reviews.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        {t.noReviews}
                                    </td>
                                </tr>
                            ) : (
                                reviews.map((review) => (
                                    <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {review.author}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={14}
                                                        className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-md truncate" title={review.content}>
                                            {review.content}
                                        </td>
                                        <td className="px-6 py-4">
                                            {review.sourceUrl && (
                                                <a
                                                    href={review.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#C9A227] hover:underline flex items-center gap-1 font-medium"
                                                >
                                                    {t.table.link} <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(review)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-[#C9A227] transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(review.id)}
                                                    className="p-1.5 hover:bg-red-50 rounded-md text-gray-600 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isFormOpen && (
                <ReviewForm
                    existingReview={editingReview}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={() => setIsFormOpen(false)} // Refresh happens via realtime listener
                />
            )}
        </div>
    );
}
