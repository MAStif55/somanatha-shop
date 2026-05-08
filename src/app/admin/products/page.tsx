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

    // Restore filters from sessionStorage on mount
    useEffect(() => {
        const saved = loadFilters();
        if (saved.categories.length) setCheckedCategories(new Set(saved.categories));
        if (saved.subcategories.length) setCheckedSubcategories(new Set(saved.subcategories));
        if (saved.search) setSearchQuery(saved.search);
        if (saved.categories.length || saved.subcategories.length) setFiltersOpen(true);
        // Expand categories that have checked subcategories
        if (saved.subcategories.length || saved.categories.length) {
            setExpandedCategories(new Set([...saved.categories, ...CATEGORIES.map(c => c.slug)]));
        }
        fetchProducts();
        fetchAllSubcategories();
    }, []);

    // Save filters to sessionStorage on change
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
                // Also uncheck all subcategories of this category
                const subs = subcategoriesMap[slug] || [];
                setCheckedSubcategories(prevSub => {
                    const nextSub = new Set(prevSub);
                    subs.forEach(s => nextSub.delete(s.slug));
                    return nextSub;
                });
            } else {
                next.add(slug);
                // Expand category when checked
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
                // Auto-check parent category
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
        // Category / subcategory filter
        let matchesFilter = true;
        if (checkedCategories.size > 0) {
            const categoryMatch = p.category ? checkedCategories.has(p.category) : false;
            if (!categoryMatch) {
                matchesFilter = false;
            } else if (checkedSubcategories.size > 0 && p.category && checkedCategories.has(p.category)) {
                // If subcategories are checked for this category, filter by them
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
                id: '', // Will be auto-generated
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
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
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

    // Reorder State
    const [isReordering, setIsReordering] = useState(false);
    const [reorderedProducts, setReorderedProducts] = useState<Product[]>([]);
    const [savingOrder, setSavingOrder] = useState(false);

    useEffect(() => {
        if (products.length > 0) {
            // Sort by order field (asc) or createdAt (desc) fallback
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
            // Initialize reordered list with current sorted products
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
            // Update all products with their new order index
            const updates = reorderedProducts.map((p, index) => ({
                id: p.id,
                order: index
            }));
            // I will use `updateProduct` from firestore-utils in the next step.

            await Promise.all(updates.map(u =>
                updateProduct(u.id, { order: u.order })
            ));

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
            <Breadcrumbs />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.product_management')}</h1>
                <div className="flex space-x-2 w-full sm:w-auto">
                    {isReordering ? (
                        <>
                            <button
                                onClick={() => setIsReordering(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                            >
                                {locale === 'ru' ? 'Отмена' : 'Cancel'}
                            </button>
                            <button
                                onClick={saveOrder}
                                disabled={savingOrder}
                                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors font-medium shadow-sm"
                            >
                                {savingOrder ? (locale === 'ru' ? 'Сохранение...' : 'Saving...') : (locale === 'ru' ? 'Сохранить порядок' : 'Save Order')}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={toggleReorderMode}
                                className="p-2 text-gray-800 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                                title={locale === 'ru' ? 'Изменить порядок' : 'Reorder'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" /></svg>
                            </button>
                            <button
                                onClick={fetchProducts}
                                className="p-2 text-gray-800 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                                title="Refresh"
                            >
                                <RefreshCw size={20} />
                            </button>
                            <Link
                                href="/admin/products/new"
                                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-semibold shadow-sm"
                            >
                                <Plus size={20} />
                                <span className="sm:hidden md:inline">{t('admin.add_new_pack')}</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Filters (Hide in Reorder Mode) */}
            {!isReordering && (
                <div className="mb-6 sticky top-0 z-20 pb-2 pt-2 -mt-2" style={{ backgroundColor: 'var(--admin-content-bg, #f8f7f5)' }}>
                    {/* Search + controls row */}
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder={locale === 'ru' ? 'Поиск товаров...' : 'Search products...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                            />
                        </div>

                        <button
                            onClick={() => setFiltersOpen(prev => !prev)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${
                                hasActiveFilters
                                    ? 'bg-orange-50 border-orange-200 text-orange-700'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Filter size={16} />
                            {locale === 'ru' ? 'Фильтры' : 'Filters'}
                            {activeFilterCount > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-orange-500 text-white rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={toggleSelectAll}
                            className="px-3 py-2 text-sm font-medium text-gray-800 bg-white border rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            {selectedIds.size === filteredProducts.length && filteredProducts.length > 0
                                ? (locale === 'ru' ? 'Снять выделение' : 'Deselect All')
                                : (locale === 'ru' ? 'Выбрать все' : 'Select All')}
                        </button>

                        {selectedIds.size > 0 && (
                            <div className="flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-lg ml-auto sm:ml-0">
                                <span className="text-sm text-red-700 font-medium">
                                    {selectedIds.size} {locale === 'ru' ? 'выбрано' : 'selected'}
                                </span>
                                <div className="h-4 w-px bg-red-200 mx-2"></div>
                                <button
                                    onClick={() => setBulkDeleteModalOpen(true)}
                                    className="flex items-center space-x-1 text-red-600 hover:text-red-800 font-medium transition-colors"
                                >
                                    <Trash2 size={16} />
                                    <span>{locale === 'ru' ? 'Удалить' : 'Delete'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Category checkbox filter panel */}
                    {filtersOpen && (
                        <div className="bg-white border rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-700">
                                    {locale === 'ru' ? 'Категории и подкатегории' : 'Categories & Subcategories'}
                                </h3>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="text-xs text-orange-600 hover:text-orange-800 font-medium transition-colors"
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
                                        <div key={cat.slug} className="min-w-[180px]">
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
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl h-[350px] animate-pulse"></div>
                    ))}
                </div>
            ) : isReordering ? (
                /* Reorder List View */
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
                    {/* Add New Card - First Item */}
                    <AddProductCard />

                    {filteredProducts.map((product) => (
                        <AdminProductCard
                            key={product.id}
                            product={product}
                            locale={locale as 'en' | 'ru'}
                            selected={selectedIds.has(product.id)}
                            onToggleSelect={(id, e) => {
                                e.preventDefault(); // Stop navigation
                                toggleSelect(id);
                            }}
                            onDuplicate={(p, e) => {
                                e.preventDefault();
                                handleDuplicate(p);
                            }}
                            onDelete={(id, e) => {
                                e.preventDefault();
                                itemToDelete && setItemToDelete(id);
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

            {/* Single Delete Modal */}
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

            {/* Bulk Delete Modal */}
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
