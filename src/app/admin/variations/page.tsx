'use client';

import { CategoryRepository, ProductRepository } from '@/lib/data';
import { useState, useEffect } from 'react';
import { VariationGroup, Product } from '@/types/product';

import { CATEGORIES } from '@/types/category';

import VariationsEditor from '@/components/admin/VariationsEditor';
import { useTranslation } from '@/contexts/LanguageContext';
import { Loader2, Save, Check, DollarSign } from 'lucide-react';

export default function VariationsPage() {
    const { locale } = useTranslation();
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].slug);
    const [variations, setVariations] = useState<Record<string, VariationGroup[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isDirty, setIsDirty] = useState<Record<string, boolean>>({});

    // Bulk Price Update State
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [bulkPrice, setBulkPrice] = useState<string>('');
    const [bulkUpdating, setBulkUpdating] = useState(false);

    useEffect(() => {
        async function loadVariations() {
            setLoading(true);
            const result: Record<string, VariationGroup[]> = {};
            for (const cat of CATEGORIES) {
                result[cat.slug] = await CategoryRepository.getVariations(cat.slug);
            }
            setVariations(result);
            setLoading(false);
        }
        loadVariations();
    }, []);

    // Fetch products when category changes
    useEffect(() => {
        async function loadProducts() {
            try {
                const data = await ProductRepository.getByCategory(activeCategory) as Product[];
                setProducts(data);
                setSelectedProducts(new Set()); // Reset selection
                setBulkPrice('');
            } catch (error) {
                console.error("Error loading products:", error);
            }
        }
        loadProducts();
    }, [activeCategory]);

    const handleVariationsChange = (categorySlug: string, newVariations: VariationGroup[]) => {
        setVariations(prev => ({ ...prev, [categorySlug]: newVariations }));
        setIsDirty(prev => ({ ...prev, [categorySlug]: true }));
        setSaved(false);
    };

    const handleSave = async (categorySlug: string) => {
        setSaving(true);
        try {
            await CategoryRepository.saveVariations(categorySlug, variations[categorySlug] || []);
            setIsDirty(prev => ({ ...prev, [categorySlug]: false }));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Error saving variations:', error);
            alert(locale === 'ru' ? 'Ошибка сохранения' : 'Error saving');
        } finally {
            setSaving(false);
        }
    };

    const handleBulkUpdate = async () => {
        if (!bulkPrice || isNaN(Number(bulkPrice)) || selectedProducts.size === 0) return;

        const price = Number(bulkPrice);
        if (!confirm(locale === 'ru'
            ? `Вы уверены, что хотите установить цену ${price} ₽ для ${selectedProducts.size} товаров?`
            : `Are you sure you want to set price to ${price} for ${selectedProducts.size} products?`)) {
            return;
        }

        setBulkUpdating(true);
        try {
            await ProductRepository.bulkUpdatePrices(Array.from(selectedProducts), price);

            // Update local state to reflect changes
            setProducts(prev => prev.map(p =>
                selectedProducts.has(p.id) ? { ...p, basePrice: price } : p
            ));

            setSelectedProducts(new Set());
            setBulkPrice('');
            alert(locale === 'ru' ? 'Цены обновлены' : 'Prices updated');
        } catch (error) {
            console.error("Bulk update failed:", error);
            alert(locale === 'ru' ? 'Ошибка обновления' : 'Update failed');
        } finally {
            setBulkUpdating(false);
        }
    };

    const toggleProductSelect = (id: string) => {
        const newSet = new Set(selectedProducts);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedProducts(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedProducts.size === products.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(products.map(p => p.id)));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-gray-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                    {locale === 'ru' ? 'Вариации по категориям' : 'Category Variations'}
                </h1>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 mb-6 border-b">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.slug}
                        onClick={() => setActiveCategory(cat.slug)}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeCategory === cat.slug
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {cat.icon} {cat.title[locale as 'en' | 'ru']}
                        {isDirty[cat.slug] && (
                            <span className="ml-2 w-2 h-2 bg-orange-500 rounded-full inline-block"></span>
                        )}
                    </button>
                ))}
            </div>

            {/* Active Category Content */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {locale === 'ru' ? 'Вариации по умолчанию для' : 'Default variations for'}{' '}
                        {CATEGORIES.find(c => c.slug === activeCategory)?.title[locale as 'en' | 'ru']}
                    </h2>
                    <button
                        onClick={() => handleSave(activeCategory)}
                        disabled={saving || !isDirty[activeCategory]}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isDirty[activeCategory]
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : saved
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {saving ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : saved ? (
                            <Check size={18} />
                        ) : (
                            <Save size={18} />
                        )}
                        {saving
                            ? (locale === 'ru' ? 'Сохранение...' : 'Saving...')
                            : saved
                                ? (locale === 'ru' ? 'Сохранено' : 'Saved')
                                : (locale === 'ru' ? 'Сохранить' : 'Save')}
                    </button>
                </div>

                <p className="text-gray-600 text-sm mb-6">
                    {locale === 'ru'
                        ? 'Эти вариации будут применяться ко всем товарам в данной категории по умолчанию. Вы можете отключить отдельные опции на странице редактирования товара.'
                        : 'These variations will be applied to all products in this category by default. You can disable specific options on the product edit page.'}
                </p>

                <VariationsEditor
                    value={variations[activeCategory] || []}
                    onChange={(newVariations) => handleVariationsChange(activeCategory, newVariations)}
                    locale={locale as 'en' | 'ru'}
                />
            </div>

            {/* Bulk Price Update Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
                <div className="flex items-center gap-2 mb-6">
                    <DollarSign className="text-orange-500" size={24} />
                    <h2 className="text-lg font-semibold text-gray-900">
                        {locale === 'ru' ? 'Массовое изменение цен' : 'Bulk Price Update'}
                    </h2>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Product List */}
                    <div className="flex-1 border rounded-lg overflow-hidden max-h-[400px] flex flex-col">
                        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                            <span className="font-medium text-sm text-gray-700">
                                {products.length} {locale === 'ru' ? 'товаров' : 'products'}
                            </span>
                            <button
                                onClick={toggleSelectAll}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                {selectedProducts.size === products.length
                                    ? (locale === 'ru' ? 'Снять выделение' : 'Deselect All')
                                    : (locale === 'ru' ? 'Выбрать все' : 'Select All')}
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1">
                            {products.length === 0 ? (
                                <p className="text-center text-gray-500 py-8 text-sm">
                                    {locale === 'ru' ? 'Нет товаров в этой категории' : 'No products in this category'}
                                </p>
                            ) : (
                                products.map(product => (
                                    <label key={product.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.has(product.id)}
                                            onChange={() => toggleProductSelect(product.id)}
                                            className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                        />
                                        <span className="flex-1 text-sm text-gray-700 truncate">
                                            {product.title[locale as 'en' | 'ru']}
                                        </span>
                                        <span className="text-sm font-mono text-gray-500">
                                            {product.basePrice} ₽
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Update Controls */}
                    <div className="w-full md:w-72 space-y-4">
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                {locale === 'ru' ? 'Новая базовая цена' : 'New Base Price'}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    value={bulkPrice}
                                    onChange={(e) => setBulkPrice(e.target.value)}
                                    className="w-full pl-3 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-2 text-gray-400">₽</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {locale === 'ru'
                                    ? `Будет обновлено ${selectedProducts.size} товаров`
                                    : `Will update ${selectedProducts.size} products`}
                            </p>
                        </div>

                        <button
                            onClick={handleBulkUpdate}
                            disabled={bulkUpdating || selectedProducts.size === 0 || !bulkPrice}
                            className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            {bulkUpdating && <Loader2 className="animate-spin" size={16} />}
                            {locale === 'ru' ? 'Обновить цены' : 'Update Prices'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
