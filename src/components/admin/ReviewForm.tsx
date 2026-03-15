'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Review } from '@/types/review';
import { X, Star } from 'lucide-react';

import { useTranslation } from "@/contexts/LanguageContext";

interface ReviewFormProps {
    existingReview?: Review | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ReviewForm({ existingReview, onClose, onSuccess }: ReviewFormProps) {
    const { locale } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        author: existingReview?.author || '',
        content: existingReview?.content || '',
        rating: existingReview?.rating || 5,
        sourceUrl: existingReview?.sourceUrl || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const reviewData = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (existingReview) {
                await updateDoc(doc(db, 'reviews', existingReview.id), reviewData);
            } else {
                await addDoc(collection(db, 'reviews'), {
                    ...reviewData,
                    createdAt: serverTimestamp(),
                });
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving review:', error);
            alert('Error saving review');
        } finally {
            setLoading(false);
        }
    };

    const t = {
        title: {
            add: locale === 'ru' ? 'Добавить отзыв' : 'Add New Review',
            edit: locale === 'ru' ? 'Редактировать отзыв' : 'Edit Review',
        },
        labels: {
            author: locale === 'ru' ? 'Автор' : 'Author Name',
            content: locale === 'ru' ? 'Текст отзыва' : 'Review Content',
            rating: locale === 'ru' ? 'Оценка' : 'Rating',
            source: locale === 'ru' ? 'Ссылка на источник (необязательно)' : 'Source URL (Optional)',
        },
        buttons: {
            cancel: locale === 'ru' ? 'Отмена' : 'Cancel',
            save: locale === 'ru' ? 'Сохранить' : 'Save Review',
            saving: locale === 'ru' ? 'Сохранение...' : 'Saving...',
        },
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">
                        {existingReview ? t.title.edit : t.title.add}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.labels.author}
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.author}
                            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C9A227]/20 focus:border-[#C9A227]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.labels.content}
                        </label>
                        <textarea
                            required
                            rows={4}
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C9A227]/20 focus:border-[#C9A227] resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.labels.rating}
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, rating: star })}
                                    className={`p-1 rounded transition-colors ${formData.rating >= star ? 'text-yellow-400' : 'text-gray-300'
                                        }`}
                                >
                                    <Star className="fill-current" size={24} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.labels.source}
                        </label>
                        <input
                            type="url"
                            value={formData.sourceUrl}
                            onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C9A227]/20 focus:border-[#C9A227]"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {t.buttons.cancel}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-[#C9A227] text-white rounded-lg hover:bg-[#B59122] transition-colors disabled:opacity-50 font-medium"
                        >
                            {loading ? t.buttons.saving : t.buttons.save}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
