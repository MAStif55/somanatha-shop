'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { CATEGORIES, CategorySlug, SubCategory } from '@/types/category';
import { getSubcategories, createSubcategory, deleteSubcategory } from '@/lib/firestore-utils';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function SubcategoriesPage() {
    const { t, locale } = useTranslation();
    const [activeTab, setActiveTab] = useState<CategorySlug>('kavacha');
    const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // New subcategory form state
    const [newTitleRu, setNewTitleRu] = useState('');
    const [newTitleEn, setNewTitleEn] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadSubcategories();
    }, [activeTab]);

    async function loadSubcategories() {
        setLoading(true);
        setError(null);
        try {
            const data = await getSubcategories<SubCategory>(activeTab);
            setSubcategories(data);
        } catch (err) {
            console.error("Error loading subcategories:", err);
            setError(locale === 'ru' ? 'Ошибка загрузки данных' : 'Error loading data');
        } finally {
            setLoading(false);
        }
    }

    // Auto-generate slug from English title
    useEffect(() => {
        if (newTitleEn && !newSlug) {
            const slug = newTitleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            setNewSlug(slug);
        }
    }, [newTitleEn]);

    async function handleAddSubcategory(e: React.FormEvent) {
        e.preventDefault();
        if (!newTitleRu || !newTitleEn || !newSlug) return;

        setIsSubmitting(true);
        try {
            const newSub: SubCategory = {
                slug: newSlug,
                title: {
                    ru: newTitleRu,
                    en: newTitleEn
                },
                parentCategory: activeTab
            };

            await createSubcategory(newSub);

            // Reset form
            setNewTitleRu('');
            setNewTitleEn('');
            setNewSlug('');

            // Reload list
            await loadSubcategories();
        } catch (err) {
            console.error("Error adding subcategory:", err);
            setError(locale === 'ru' ? 'Ошибка при добавлении' : 'Error adding subcategory');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm(locale === 'ru' ? 'Вы уверены?' : 'Are you sure?')) return;

        try {
            await deleteSubcategory(id);
            await loadSubcategories();
        } catch (err) {
            console.error("Error deleting subcategory:", err);
            alert(locale === 'ru' ? 'Ошибка удаления' : 'Error deleting');
        }
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                {locale === 'ru' ? 'Управление подкатегориями' : 'Manage Subcategories'}
            </h1>

            {/* Category Tabs */}
            <div className="flex border-b mb-6">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.slug}
                        onClick={() => setActiveTab(cat.slug)}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === cat.slug
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {cat.title[locale]}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* List Column */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">
                        {locale === 'ru' ? 'Список' : 'List'}
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-primary" />
                        </div>
                    ) : subcategories.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            {locale === 'ru' ? 'Нет подкатегорий' : 'No subcategories found'}
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {subcategories.map(sub => (
                                <li key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border group hover:border-primary/30 transition-colors">
                                    <div>
                                        <div className="font-medium text-gray-900">{sub.title[locale]}</div>
                                        <div className="text-xs text-gray-500 font-mono">{sub.slug}</div>
                                    </div>
                                    <button
                                        onClick={() => sub.id && handleDelete(sub.id)}
                                        className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Add Form Column */}
                <div className="bg-white p-6 rounded-lg shadow-sm border h-fit">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">
                        {locale === 'ru' ? 'Добавить новую' : 'Add New'}
                    </h2>

                    <form onSubmit={handleAddSubcategory} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {locale === 'ru' ? 'Название (RU)' : 'Title (RU)'}
                            </label>
                            <input
                                type="text"
                                value={newTitleRu}
                                onChange={e => setNewTitleRu(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                                placeholder="Кольца"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {locale === 'ru' ? 'Название (EN)' : 'Title (EN)'}
                            </label>
                            <input
                                type="text"
                                value={newTitleEn}
                                onChange={e => setNewTitleEn(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                                placeholder="Rings"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Slug (ID)
                            </label>
                            <input
                                type="text"
                                value={newSlug}
                                onChange={e => setNewSlug(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none font-mono text-sm"
                                placeholder="rings"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {locale === 'ru'
                                    ? 'Используется в URL. Только латинские буквы, цифры и дефис.'
                                    : 'Used in URL. Lowercase letters, numbers, and hyphens only.'}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                            {locale === 'ru' ? 'Добавить' : 'Add Subcategory'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
