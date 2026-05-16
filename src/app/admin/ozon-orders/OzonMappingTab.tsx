'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, CheckCircle, Link as LinkIcon, Unlink } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface OzonProduct {
    offerId: string;
    name: string;
    sku: number;
    barcode: string | null;
}

interface LocalProduct {
    id: string;
    slug: string;
    title: { ru: string; en: string };
    ozonOfferId?: string;
}

export default function OzonMappingTab() {
    const { locale } = useTranslation();
    const [ozonProducts, setOzonProducts] = useState<OzonProduct[]>([]);
    const [localProducts, setLocalProducts] = useState<LocalProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Ozon products
            const ozonRes = await fetch('/api/ozon-products');
            let ozonData: OzonProduct[] = [];
            if (ozonRes.ok) ozonData = await ozonRes.json();

            // Fetch Local products (via inventory route trick or catalog)
            // Wait, we don't have a direct GET /api/products yet that returns all fields including ozonOfferId.
            // Let's create an endpoint or just fetch /api/inventory?includeSiteProducts=true which currently only returns basic inventory items.
            // Actually, we need to fetch local products. Let's create a small route for this, or just use a generic fetch.
            // Assuming /api/products exists. Let's wait, I need to create /api/products route if it doesn't exist.
            const localRes = await fetch('/api/products');
            let localData: LocalProduct[] = [];
            if (localRes.ok) localData = await localRes.json();

            setOzonProducts(ozonData);
            setLocalProducts(localData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleMap = async (ozonOfferId: string, localProductId: string) => {
        setSaving(prev => ({ ...prev, [ozonOfferId]: true }));
        try {
            const res = await fetch('/api/products/map-ozon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: localProductId, ozonOfferId: ozonOfferId || '' }),
            });
            if (res.ok) {
                // Update local state
                setLocalProducts(prev => prev.map(p => {
                    if (p.id === localProductId) return { ...p, ozonOfferId };
                    if (p.ozonOfferId === ozonOfferId) return { ...p, ozonOfferId: undefined }; // clear previous
                    return p;
                }));
            } else {
                alert(locale === 'ru' ? 'Ошибка сохранения' : 'Save error');
            }
        } catch (error) {
            alert(locale === 'ru' ? 'Ошибка сохранения' : 'Save error');
        } finally {
            setSaving(prev => ({ ...prev, [ozonOfferId]: false }));
        }
    };

    const handleAutoMap = () => {
        // Simple fuzzy match algorithm: check if ozon title is very similar to local title
        ozonProducts.forEach(op => {
            // Only map if not mapped
            if (!localProducts.some(lp => lp.ozonOfferId === op.offerId)) {
                // Find best match
                const opName = op.name.toLowerCase().replace(/[^a-zа-я0-9]/g, '');
                const bestMatch = localProducts.find(lp => {
                    if (lp.ozonOfferId) return false;
                    const lpName = lp.title.ru.toLowerCase().replace(/[^a-zа-я0-9]/g, '');
                    return opName.includes(lpName) || lpName.includes(opName);
                });

                if (bestMatch) {
                    handleMap(op.offerId, bestMatch.id);
                }
            }
        });
    };

    const filteredOzon = ozonProducts.filter(op => 
        op.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        op.offerId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-auto rounded-xl border bg-white shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center flex-shrink-0 bg-gray-50/50 justify-between">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder={locale === 'ru' ? 'Поиск по артикулу Ozon или названию...' : 'Search Ozon SKU...'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-500"
                        />
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="admin-btn-secondary"
                        title={locale === 'ru' ? 'Обновить список' : 'Refresh list'}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
                <button
                    onClick={handleAutoMap}
                    disabled={loading || ozonProducts.length === 0}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors border border-indigo-100"
                >
                    <LinkIcon size={16} />
                    {locale === 'ru' ? 'Авто-связка по названиям' : 'Auto-map by names'}
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredOzon.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <p className="text-lg font-medium">{locale === 'ru' ? 'Товары на Ozon не найдены' : 'No items found on Ozon'}</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-white shadow-sm">
                            <tr>
                                <th className="text-left px-4 py-3 w-1/2">{locale === 'ru' ? 'Товар на Ozon' : 'Ozon Product'}</th>
                                <th className="text-left px-4 py-3 w-1/2">{locale === 'ru' ? 'Товар на сайте' : 'Site Product'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOzon.map(op => {
                                const mappedLocal = localProducts.find(lp => lp.ozonOfferId === op.offerId);
                                
                                return (
                                    <tr key={op.offerId} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-gray-900 mb-1">{op.name}</div>
                                            <div className="text-[11px] text-gray-500 font-mono bg-gray-100 inline-block px-1.5 py-0.5 rounded">
                                                {locale === 'ru' ? 'Артикул:' : 'SKU:'} {op.offerId}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 relative">
                                            {saving[op.offerId] && (
                                                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-md">
                                                    <RefreshCw size={20} className="animate-spin text-blue-500" />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 w-full max-w-sm">
                                                <select
                                                    value={mappedLocal?.id || ''}
                                                    onChange={e => handleMap(op.offerId, e.target.value)}
                                                    className={`flex-1 p-2 border rounded-md text-sm ${mappedLocal ? 'bg-green-50 border-green-200 text-green-900' : 'bg-gray-50 border-gray-200'}`}
                                                >
                                                    <option value="">{locale === 'ru' ? '-- Не связан --' : '-- Not mapped --'}</option>
                                                    {localProducts.map(lp => (
                                                        <option key={lp.id} value={lp.id}>
                                                            {lp.title.ru || lp.title.en} (URL: {lp.slug})
                                                        </option>
                                                    ))}
                                                </select>
                                                {mappedLocal && (
                                                    <button
                                                        onClick={() => handleMap('', mappedLocal.id)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title={locale === 'ru' ? 'Удалить связь' : 'Unlink'}
                                                    >
                                                        <Unlink size={16} />
                                                    </button>
                                                )}
                                                {mappedLocal && <CheckCircle size={18} className="text-green-500 flex-shrink-0" />}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
