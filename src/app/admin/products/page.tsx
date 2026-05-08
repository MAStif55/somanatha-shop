'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAllProducts, createProduct, updateProduct, deleteProduct, getSubcategories } from '@/actions/admin-actions';

import { Product, getThumbImageUrl } from '@/types/product';
import { CATEGORIES, CategorySlug, SubCategory } from '@/types/category';
import { Plus, Trash2, RefreshCw, Search, ChevronDown, Filter } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/contexts/LanguageContext';
import ConfirmModal from '@/components/admin/ConfirmModal';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { AdminProductCard } from '@/components/admin/AdminProductCard';
import { AddProductCard } from '@/components/admin/AddProductCard';
import { formatPrice } from '@/utils/currency';

const STORAGE_KEY = 'admin_products_filters';

interface FilterState {
    categories: string[];
    subcategories: string[];
    search: string;
}

function loadFilters(): FilterState {
    if (typeof window === 'undefined') return { categories: [], subcategories: [], search: '' };
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    return { categories: [], subcategories: [], search: '' };
}

function saveFilters(state: FilterState) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [checkedCategories, setCheckedCategories] = useState<Set<string>>(new Set());
    const [checkedSubcategories, setCheckedSubcategories] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
    const [subcategoriesMap, setSubcategoriesMap] = useState<Record<string, SubCategory[]>>({});
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [filtersOpen, setFiltersOpen] = useState(true);
    const { t, locale } = useTranslation();

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await getAllProducts() as Product[];
            setProducts(data);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const saved = loadFilters();
        if (saved.categories.length) setCheckedCategories(new Set(saved.categories));
        if (saved.subcategories.length) setCheckedSubcategories(new Set(saved.subcategories));
        if (saved.search) setSearchQuery(saved.search);
        if (saved.categories.length || saved.subcategories.length) setFiltersOpen(true);
        if (saved.subcategories.length || saved.categories.length) {
            setExpandedCategories(new Set([...saved.categories, ...CATEGORIES.map(c => c.slug)]));
        }
        fetchProducts();
        fetchAllSubcategories();
    }, []);

    useEffect(() => {
        saveFilters({
            categories: Array.from(checkedCategories),
            subcategories: Array.from(checkedSubcategories),
            search: searchQuery,
        });
    }, [checkedCategories, checkedSubcategories, searchQuery]);

    const fetchAllSubcategories = useCallback(async () => {
        try {
            const results: Record<string, SubCategory[]> = {};
            for (const cat of CATEGORIES) {
                results[cat.slug] = await getSubcategories(cat.slug);
            }
            setSubcategoriesMap(results);
        } catch (error) {
            console.error('Error fetching subcategories:', error);
        }
    }, []);

    const toggleCategory = (slug: string) => {
        setCheckedCategories(prev => {
            const next = new Set(prev);
            if (next.has(slug)) {
                next.delete(slug);
                const subs = subcategoriesMap[slug] || [];
                setCheckedSubcategories(prevSub => {
                    const nextSub = new Set(prevSub);
                    subs.forEach(s => nextSub.delete(s.slug));
                    return nextSub;
                });
            } else {
                next.add(slug);
                setExpandedCategories(prev => new Set(prev).add(slug));
            }
            return next;
        });
    };

    const toggleSubcategory = (catSlug: string, subSlug: string) => {
        setCheckedSubcategories(prev => {
            const next = new Set(prev);
            if (next.has(subSlug)) {
                next.delete(subSlug);
            } else {
                next.add(subSlug);
                setCheckedCategories(prevCat => new Set(prevCat).add(catSlug));
            }
            return next;
        });
    };

    const toggleExpanded = (slug: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(slug)) next.delete(slug);
            else next.add(slug);
            return next;
        });
    };

    const clearAllFilters = () => {
        setCheckedCategories(new Set());
        setCheckedSubcategories(new Set());
        setSearchQuery('');
    };

    const hasActiveFilters = checkedCategories.size > 0 || checkedSubcategories.size > 0 || searchQuery.length > 0;

    const filteredProducts = products.filter(p => {
        let matchesFilter = true;
        if (checkedCategories.size > 0) {
            const categoryMatch = p.category ? checkedCategories.has(p.category) : false;
            if (!categoryMatch) {
                matchesFilter = false;
            } else if (checkedSubcategories.size > 0 && p.category && checkedCategories.has(p.category)) {
                const relevantSubs = Array.from(checkedSubcategories).filter(sub => {
                    const catSubs = subcategoriesMap[p.category!] || [];
                    return catSubs.some(s => s.slug === sub);
                });
                if (relevantSubs.length > 0) {
                    matchesFilter = p.subcategory ? relevantSubs.includes(p.subcategory) : false;
                }
            }
        }
        const matchesSearch = searchQuery
            ? (p.title.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.title.ru.toLowerCase().includes(searchQuery.toLowerCase()))
            : true;
        return matchesFilter && matchesSearch;
    });

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteProduct(itemToDelete);
            fetchProducts();
        } catch (error) {
            console.error("Error deleting product:", error);
            alert(t('admin.delete_failed'));
        } finally {
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const handleBulkDelete = async () => {
        try {
            for (const id of Array.from(selectedIds)) {
                await deleteProduct(id);
            }
            setSelectedIds(new Set());
            fetchProducts();
        } catch (error) {
            console.error("Error bulk deleting:", error);
            alert(t('admin.delete_failed'));
        } finally {
            setBulkDeleteModalOpen(false);
        }
    };

    const handleDuplicate = async (product: Product) => {
        try {
            const duplicate: Product = {
                ...product,
                id: '',
                slug: `${product.slug}-copy`,
                title: {
                    en: `${product.title.en} (Copy)`,
                    ru: `${product.title.ru} (Копия)`
                }
            };
            await createProduct(duplicate);
            fetchProducts();
        } catch (error) {
            console.error("Error duplicating:", error);
            alert("Failed to duplicate product");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const activeFilterCount = checkedCategories.size + checkedSubcategories.size;

    const [isReordering, setIsReordering] = useState(false);
    const [reorderedProducts, setReorderedProducts] = useState<Product[]>([]);
    const [savingOrder, setSavingOrder] = useState(false);

    useEffect(() => {
        if (products.length > 0) {
            const sorted = [...products].sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
            setProducts(sorted);
        }
    }, []);

    const toggleReorderMode = () => {
        if (isReordering) {
            setIsReordering(false);
        } else {
            const sorted = [...filteredProducts].sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
            setReorderedProducts(sorted);
            setIsReordering(true);
        }
    };

    const moveProduct = (index: number, direction: 'up' | 'down') => {
        const newItems = [...reorderedProducts];
        if (direction === 'up' && index > 0) {
            [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        } else if (direction === 'down' && index < newItems.length - 1) {
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        }
        setReorderedProducts(newItems);
    };

    const saveOrder = async () => {
        setSavingOrder(true);
        try {
            const updates = reorderedProducts.map((p, index) => ({ id: p.id, order: index }));
            await Promise.all(updates.map(u => updateProduct(u.id, { order: u.order })));
            setProducts(prev => {
                const map = new Map(prev.map(p => [p.id, p]));
                updates.forEach(u => {
                    const p = map.get(u.id);
                    if (p) p.order = u.order;
                });
                return Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
            });
            setIsReordering(false);
            alert(locale === 'ru' ? 'Порядок сохранен' : 'Order saved');
        } catch (error) {
            console.error("Failed to save order", error);
            alert("Failed to save order");
        } finally {
            setSavingOrder(false);
        }
    };

    return (
        <div>
            {/* ── Sticky header ── */}
            <div
                className="sticky top-0 z-30 px-8 pt-4 pb-3 mb-4 border-b border-gray-200 shadow-sm"
                style={{ backgroundColor: 'var(--admin-content-bg, #f8f7f5)' }}
            >
                <Breadcrumbs />

                {/* Title + action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-3">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('admin.product_management')}
                    </h1>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isReordering ? (
                            <>
                                <button
                                    onClick={() => setIsReordering(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
                                >
                                    {locale === 'ru' ? 'Отмена' : 'Cancel'}
                                </button>
                                <button
                                    onClick={saveOrder}
                                    disabled={savingOrder}
                                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors font-medium text-sm"
                                >
                                    {savingOrder
                                        ? (locale === 'ru' ? 'Сохранение...' : 'Saving...')
                                        : (locale === 'ru' ? 'Сохранить порядок' : 'Save Order')}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={toggleReorderMode}
                                    className="p-2 text-gray-700 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
                                    title={locale === 'ru' ? 'Изменить порядок' : 'Reorder'}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" /></svg>
                                </button>
                                <button
                                    onClick={fetchProducts}
                                    className="p-2 text-gray-700 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw size={18} />
                                </button>
                                <Link
                                    href="/admin/products/new"
                                    className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-semibold text-sm shadow-sm whitespace-nowrap"
                                >
                                    <Plus size={18} />
                                    {t('admin.add_new_pack')}
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Search + filter controls (hidden in reorder mode) */}
                {!isReordering && (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[160px] flex-1 max-w-xs">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder={locale === 'ru' ? 'Поиск...' : 'Search...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 text-sm"
                            />
                        </div>

                        <button
                            onClick={() => setFiltersOpen(prev => !prev)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors whitespace-nowrap ${
                                hasActiveFilters
                                    ? 'bg-orange-50 border-orange-200 text-orange-700'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                            }`}
                        >
                            <Filter size={14} />
                            {locale === 'ru' ? 'Фильтры' : 'Filters'}
                            {activeFilterCount > 0 && (
                                <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold bg-orange-500 text-white rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={toggleSelectAll}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                            {selectedIds.size === filteredProducts.length && filteredProducts.length > 0
                                ? (locale === 'ru' ? 'Снять выделение' : 'Deselect All')
                                : (locale === 'ru' ? 'Выбрать все' : 'Select All')}
                        </button>

                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg">
                                <span className="text-sm text-red-700 font-medium whitespace-nowrap">
                                    {selectedIds.size} {locale === 'ru' ? 'выбр.' : 'sel.'}
                                </span>
                                <button
                                    onClick={() => setBulkDeleteModalOpen(true)}
                                    className="flex items-center gap-1 text-red-600 hover:text-red-800 font-medium text-sm whitespace-nowrap"
                                >
                                    <Trash2 size={14} />
                                    {locale === 'ru' ? 'Удалить' : 'Delete'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* ── End sticky header ── */}

            {/* Category filter panel — not sticky, drops below header */}
            {!isReordering && filtersOpen && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700">
                            {locale === 'ru' ? 'Категории и подкатегории' : 'Categories & Subcategories'}
                        </h3>
                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                            >
                                {locale === 'ru' ? 'Сбросить все' : 'Clear all'}
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                        {CATEGORIES.map(cat => {
                            const subs = subcategoriesMap[cat.slug] || [];
                            const isExpanded = expandedCategories.has(cat.slug);
                            const isChecked = checkedCategories.has(cat.slug);
                            return (
                                <div key={cat.slug} className="min-w-[160px]">
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer group py-1">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleCategory(cat.slug)}
                                                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                            />
                                            <span className={`text-sm font-semibold transition-colors ${
                                                isChecked ? 'text-orange-700' : 'text-gray-800 group-hover:text-gray-600'
                                            }`}>
                                                {cat.title[locale]}
                                            </span>
                                        </label>
                                        {subs.length > 0 && (
                                            <button
                                                onClick={() => toggleExpanded(cat.slug)}
                                                className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <ChevronDown
                                                    size={14}
                                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                            </button>
                                        )}
                                    </div>
                                    {subs.length > 0 && isExpanded && (
                                        <div className="ml-6 mt-1 space-y-0.5 pb-2 border-l-2 border-gray-100 pl-3">
                                            {subs.map(sub => {
                                                const subChecked = checkedSubcategories.has(sub.slug);
                                                return (
                                                    <label
                                                        key={sub.slug}
                                                        className="flex items-center gap-2 cursor-pointer group py-0.5"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={subChecked}
                                                            onChange={() => toggleSubcategory(cat.slug, sub.slug)}
                                                            className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                                                        />
                                                        <span className={`text-xs transition-colors ${
                                                            subChecked ? 'text-orange-600 font-medium' : 'text-gray-600 group-hover:text-gray-800'
                                                        }`}>
                                                            {sub.title[locale]}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Product grid / reorder / loading */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl h-[350px] animate-pulse"></div>
                    ))}
                </div>
            ) : isReordering ? (
                <div className="space-y-2 pb-20 max-w-2xl mx-auto">
                    <p className="text-center text-sm text-gray-500 mb-4 bg-blue-50 p-2 rounded border border-blue-100">
                        {locale === 'ru'
                            ? 'Используйте стрелки для изменения порядка отображения товаров в каталоге.'
                            : 'Use arrows to reorder how products appear in the catalog.'}
                    </p>
                    {reorderedProducts.map((product, index) => (
                        <div key={product.id} className="flex items-center gap-4 bg-white p-3 rounded-lg border shadow-sm">
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => moveProduct(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                </button>
                                <button
                                    onClick={() => moveProduct(index, 'down')}
                                    disabled={index === reorderedProducts.length - 1}
                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                            </div>
                            <img
                                src={product.images?.[0] ? getThumbImageUrl(product.images[0]) : ''}
                                alt={product.title.en}
                                className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900 line-clamp-1">{locale === 'ru' ? product.title.ru : product.title.en}</h3>
                                <p className="text-xs text-gray-500">{formatPrice(product.basePrice)}</p>
                            </div>
                            <span className="text-xs font-mono text-gray-400">#{index + 1}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                    <AddProductCard />
                    {filteredProducts.map((product) => (
                        <AdminProductCard
                            key={product.id}
                            product={product}
                            locale={locale as 'en' | 'ru'}
                            selected={selectedIds.has(product.id)}
                            onToggleSelect={(id, e) => {
                                e.preventDefault();
                                toggleSelect(id);
                            }}
                            onDuplicate={(p, e) => {
                                e.preventDefault();
                                handleDuplicate(p);
                            }}
                            onDelete={(id, e) => {
                                e.preventDefault();
                                setItemToDelete(id);
                                setDeleteModalOpen(true);
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && !isReordering && filteredProducts.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-800 mb-4 font-medium">{t('admin.no_products')}</p>
                    <button onClick={clearAllFilters} className="text-gray-900 underline font-bold hover:text-primary">
                        {locale === 'ru' ? 'Очистить фильтры' : 'Clear filters'}
                    </button>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModalOpen}
                title={locale === 'ru' ? 'Удалить товар?' : 'Delete Product?'}
                message={locale === 'ru' ? 'Это действие нельзя отменить.' : 'This action cannot be undone.'}
                confirmLabel={locale === 'ru' ? 'Удалить' : 'Delete'}
                cancelLabel={locale === 'ru' ? 'Отмена' : 'Cancel'}
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
            />

            <ConfirmModal
                isOpen={bulkDeleteModalOpen}
                title={locale === 'ru' ? `Удалить ${selectedIds.size} товаров?` : `Delete ${selectedIds.size} products?`}
                message={locale === 'ru' ? 'Это действие нельзя отменить.' : 'This action cannot be undone.'}
                confirmLabel={locale === 'ru' ? 'Удалить все' : 'Delete All'}
                cancelLabel={locale === 'ru' ? 'Отмена' : 'Cancel'}
                variant="danger"
                onConfirm={handleBulkDelete}
                onCancel={() => setBulkDeleteModalOpen(false)}
            />
        </div>
    );
}
