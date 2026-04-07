'use client';

import { ProductRepository, CategoryRepository } from '@/lib/data';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product, VariationOverrides, ProductImage } from '@/types/product';


import { Loader2, Save, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import ImageUpload from './ImageUpload';
import VideoUpload from './VideoUpload';
import { useTranslation } from '@/contexts/LanguageContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import MarkdownEditor from './MarkdownEditor';
import AutoResizeTextarea from '@/components/ui/AutoResizeTextarea';
import VariationsEditor from './VariationsEditor';
import { VariationGroup } from '@/types/product';

// Predefined categories - customize for your project
// Predefined categories - specific to Somanatha Shop
import { CATEGORIES, SubCategory } from '@/types/category';


interface ProductFormProps {
    initialData?: Product | null;
    isEditMode?: boolean;
}

export default function ProductForm({ initialData, isEditMode = false }: ProductFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { t, locale } = useTranslation();
    const [isDirty, setIsDirty] = useState(false);

    const [showExitConfirmation, setShowExitConfirmation] = useState(false);
    const [showEnglish, setShowEnglish] = useState(false);
    const [showVariations, setShowVariations] = useState(!!initialData?.variations?.length || !!initialData?.variationOverrides);
    const [categoryVariations, setCategoryVariations] = useState<VariationGroup[]>([]);
    const [availableSubcategories, setAvailableSubcategories] = useState<SubCategory[]>([]);
    const [useDefaults, setUseDefaults] = useState(initialData?.variationOverrides?.useDefaults !== false);
    const [disabledOptions, setDisabledOptions] = useState<string[]>(initialData?.variationOverrides?.disabledOptions || []);

    const [formData, setFormData] = useState<Partial<Product>>(
        initialData || {
            title: { en: '', ru: '' },
            shortDescription: { en: '', ru: '' },
            description: { en: '', ru: '' },
            slug: '',
            basePrice: 0,
            images: [],
            videoPreviewUrl: '',
            videoUrl: '',
            category: '',
            tags: [],
            variations: [],
        }
    );

    const [tagsInput, setTagsInput] = useState((initialData?.tags || []).join(', '));

    // Load category variations when category changes
    useEffect(() => {
        async function loadCategoryVariations() {
            if (formData.category) {
                const variations = await CategoryRepository.getVariations(formData.category);
                setCategoryVariations(variations);

                // Fetch subcategories
                const subs = await CategoryRepository.getSubcategories(formData.category) as SubCategory[];
                setAvailableSubcategories(subs);

                // Reset subcategory if category changes
                if (formData.category !== initialData?.category) {
                    setFormData(prev => ({ ...prev, subcategory: '' }));
                }
            } else {
                setCategoryVariations([]);
            }
        }
        loadCategoryVariations();
    }, [formData.category]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { name: string, value: string } }) => {
        const { name, value } = e.target;
        setIsDirty(true);
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...(prev as any)[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Helper for direct value changes (for MarkdownEditor)
    const handleValueChange = (name: string, value: string) => {
        handleChange({ target: { name, value } });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsDirty(true);
        setFormData(prev => ({ ...prev, basePrice: Number(e.target.value) }));
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsDirty(true);
        setTagsInput(e.target.value);
        const tags = e.target.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        setFormData(prev => ({ ...prev, tags }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditMode && initialData?.id) {
                await ProductRepository.update(initialData.id, formData);
            } else {
                await ProductRepository.create(formData as Product);
            }
            router.push('/admin/products');
            router.refresh();
        } catch (error: any) {
            console.error("Error saving product:", error);
            let msg = t('admin.save_error') || "Failed to save product";
            if (error.code === 'permission-denied') {
                msg += ": Permission Denied (Are you logged in?)";
            } else if (error.message) {
                msg += `: ${error.message}`;
            }
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                    <button
                        type="button"
                        onClick={() => isDirty ? setShowExitConfirmation(true) : router.push('/admin/products')}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold text-graphite">
                        {isEditMode ? t('admin.edit_product') : t('admin.create_product')}
                    </h1>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    <span>{loading ? t('admin.loading') : t('admin.save')}</span>
                </button>
            </div>

            <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1">Slug (URL)</label>
                        <input
                            type="text"
                            name="slug"
                            value={formData.slug}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900"
                            placeholder="yantra-shri"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1">{t('admin.base_price')} (₽)</label>
                        <input
                            type="number"
                            name="basePrice"
                            value={formData.basePrice}
                            onChange={handlePriceChange}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1">
                            {locale === 'ru' ? 'Категория' : 'Category'}
                        </label>
                        <select
                            name="category"
                            value={formData.category || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900"
                        >
                            <option value="">{locale === 'ru' ? '— Выберите —' : '— Select —'}</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat.slug} value={cat.slug}>
                                    {cat.title[locale as 'en' | 'ru']}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Subcategory - Only show if category has subcategories */}
                    {availableSubcategories.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">
                                {locale === 'ru' ? 'Подкатегория' : 'Subcategory'}
                            </label>
                            <select
                                name="subcategory"
                                value={formData.subcategory || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900"
                            >
                                <option value="">{locale === 'ru' ? '— Выберите —' : '— Select —'}</option>
                                {availableSubcategories.map(sub => (
                                    <option key={sub.slug} value={sub.slug}>
                                        {sub.title[locale as 'en' | 'ru']}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">
                        {locale === 'ru' ? 'Теги (через запятую)' : 'Tags (comma-separated)'}
                    </label>
                    <input
                        type="text"
                        value={tagsInput}
                        onChange={handleTagsChange}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900"
                        placeholder="protection, wealth, health"
                    />
                    {formData.tags && formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded-full font-medium">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* English Content (Optional) */}
                <div className="border-t pt-6">
                    <button
                        type="button"
                        onClick={() => setShowEnglish(!showEnglish)}
                        className="flex items-center justify-between w-full text-left group"
                    >
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            English Content <span className="text-sm font-normal text-gray-500">(optional)</span>
                        </h3>
                        {showEnglish ? (
                            <ChevronUp className="text-gray-500 group-hover:text-primary transition-colors" />
                        ) : (
                            <ChevronDown className="text-gray-500 group-hover:text-primary transition-colors" />
                        )}
                    </button>

                    {showEnglish && (
                        <div className="space-y-4 mt-4 animate-fade-in">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">Title (EN)</label>
                                <input
                                    type="text"
                                    name="title.en"
                                    value={formData.title?.en}
                                    onChange={handleChange}
                                    placeholder="Leave empty to use Russian title"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">Short Description (EN)</label>
                                <AutoResizeTextarea
                                    name="shortDescription.en"
                                    value={formData.shortDescription?.en || ''}
                                    onChange={handleChange}
                                    placeholder="Brief description for product cards"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900 resize-none overflow-hidden bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1">Full Description (EN)</label>
                                <MarkdownEditor
                                    value={formData.description?.en || ''}
                                    onChange={(val) => handleValueChange('description.en', val)}
                                    placeholder="Full product description (Markdown supported)..."
                                    className="min-h-[200px]"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Russian Content */}
                <div className="border-t pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Русский контент</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Название (RU)</label>
                            <input
                                type="text"
                                name="title.ru"
                                value={formData.title?.ru}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Краткое описание (RU)</label>
                            <AutoResizeTextarea
                                name="shortDescription.ru"
                                value={formData.shortDescription?.ru || ''}
                                onChange={handleChange}
                                placeholder="Краткое описание для карточек товаров"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900 resize-none overflow-hidden bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Полное описание (RU)</label>
                            <MarkdownEditor
                                value={formData.description?.ru || ''}
                                onChange={(val) => handleValueChange('description.ru', val)}
                                placeholder="Полное описание товара (поддерживает Markdown)..."
                                className="min-h-[200px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Variations */}
                <div className="border-t pt-6">
                    <button
                        type="button"
                        onClick={() => setShowVariations(!showVariations)}
                        className="flex items-center justify-between w-full text-left group mb-4"
                    >
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {locale === 'ru' ? 'Вариации товара' : 'Product Variations'}
                            {categoryVariations.length > 0 && (
                                <span className="text-xs font-normal text-green-600 bg-green-100 px-2 py-0.5 rounded">
                                    {locale === 'ru' ? 'Есть по умолчанию' : 'Has defaults'}
                                </span>
                            )}
                        </h3>
                        {showVariations ? (
                            <ChevronUp className="text-gray-500 group-hover:text-primary transition-colors" />
                        ) : (
                            <ChevronDown className="text-gray-500 group-hover:text-primary transition-colors" />
                        )}
                    </button>

                    {showVariations && (
                        <div className="space-y-6">
                            {/* Category Defaults Toggle */}
                            {categoryVariations.length > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useDefaults}
                                            onChange={(e) => {
                                                setUseDefaults(e.target.checked);
                                                setIsDirty(true);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    variationOverrides: {
                                                        useDefaults: e.target.checked,
                                                        disabledOptions: disabledOptions,
                                                    }
                                                }));
                                            }}
                                            className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-900">
                                                {locale === 'ru' ? 'Использовать вариации категории' : 'Use category variations'}
                                            </span>
                                            <p className="text-sm text-gray-600">
                                                {locale === 'ru'
                                                    ? 'Наследовать вариации по умолчанию для этой категории'
                                                    : 'Inherit default variations for this category'}
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* Inherited Variations with Disable Options */}
                            {useDefaults && categoryVariations.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-700">
                                        {locale === 'ru' ? 'Унаследованные вариации (отключите ненужные)' : 'Inherited variations (disable unwanted)'}
                                    </h4>
                                    {categoryVariations.map(group => (
                                        <div key={group.id} className="bg-gray-50 border rounded-lg p-4">
                                            <h5 className="font-medium text-gray-900 mb-3">{group.name[locale as 'en' | 'ru']}</h5>
                                            <div className="flex flex-wrap gap-3">
                                                {group.options.map(option => {
                                                    const isDisabled = disabledOptions.includes(option.id);
                                                    return (
                                                        <label
                                                            key={option.id}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${isDisabled
                                                                ? 'bg-gray-200 border-gray-300 text-gray-500 line-through'
                                                                : 'bg-white border-green-300 text-gray-900'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={!isDisabled}
                                                                onChange={(e) => {
                                                                    const newDisabled = e.target.checked
                                                                        ? disabledOptions.filter(id => id !== option.id)
                                                                        : [...disabledOptions, option.id];
                                                                    setDisabledOptions(newDisabled);
                                                                    setIsDirty(true);
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        variationOverrides: {
                                                                            useDefaults: true,
                                                                            disabledOptions: newDisabled,
                                                                        }
                                                                    }));
                                                                }}
                                                                className="w-4 h-4 text-green-600 rounded border-gray-300"
                                                            />
                                                            <span className="text-sm font-medium">
                                                                {option.label[locale as 'en' | 'ru']}
                                                            </span>
                                                            {option.priceModifier !== 0 && (
                                                                <span className="text-xs text-gray-500">
                                                                    {option.priceModifier > 0 ? '+' : ''}{option.priceModifier}₽
                                                                </span>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Custom Variations Editor (when not using defaults or no defaults exist) */}
                            {(!useDefaults || categoryVariations.length === 0) && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                        {locale === 'ru' ? 'Пользовательские вариации' : 'Custom variations'}
                                    </h4>
                                    <VariationsEditor
                                        value={formData.variations || []}
                                        onChange={(variations: VariationGroup[]) => {
                                            setIsDirty(true);
                                            setFormData(prev => ({ ...prev, variations }));
                                        }}
                                        locale={locale as 'en' | 'ru'}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t pt-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {locale === 'ru' ? 'Изображения товара' : 'Product Images'}
                    </label>
                    <ImageUpload
                        value={formData.images || []}
                        onChange={(urls) => {
                            setIsDirty(true);
                            setFormData(prev => ({ ...prev, images: urls }));
                        }}
                    />
                </div>

                {/* Video Preview */}
                <div className="border-t pt-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {locale === 'ru' ? 'Live Photo (Видеопревью)' : 'Live Photo (Video Preview)'}
                    </label>
                    <VideoUpload
                        value={formData.videoPreviewUrl}
                        onChange={({ videoUrl, videoPreviewUrl }) => {
                            setIsDirty(true);
                            setFormData(prev => ({ ...prev, videoUrl, videoPreviewUrl }));
                        }}
                    />
                </div>
            </div>

            {/* Bottom Save Bar */}
            < div className="mt-8 pt-6 border-t flex justify-end" >
                <button
                    type="submit"
                    disabled={loading || !isDirty}
                    className="flex items-center space-x-2 bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-100 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg font-bold"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    <span>{loading ? t('admin.loading') : (isDirty ? t('admin.save_changes') : t('admin.saved'))}</span>
                </button>
            </div >

            <ConfirmModal
                isOpen={showExitConfirmation}
                title={locale === 'ru' ? 'Несохраненные изменения' : 'Unsaved Changes'}
                message={locale === 'ru' ? 'У вас есть несохраненные изменения. Вы уверены, что хотите уйти?' : 'You have unsaved changes. Are you sure you want to leave?'}
                confirmLabel={locale === 'ru' ? 'Уйти без сохранения' : 'Discard Changes'}
                cancelLabel={locale === 'ru' ? 'Продолжить редактирование' : 'Keep Editing'}
                saveLabel={locale === 'ru' ? 'Сохранить и выйти' : 'Save & Exit'}
                variant="danger"
                onConfirm={() => router.push('/admin/products')}
                onCancel={() => setShowExitConfirmation(false)}
                onSave={async () => {
                    await handleSubmit({ preventDefault: () => { } } as React.FormEvent);
                    setShowExitConfirmation(false);
                }}
            />
        </form >
    );
}
