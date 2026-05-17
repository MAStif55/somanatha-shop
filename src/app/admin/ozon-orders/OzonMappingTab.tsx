'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, CheckCircle, Link as LinkIcon, Unlink, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface OzonProduct {
    offerId: string;
    name: string;
    sku: number;
    barcode: string | null;
    image?: string | null;
}

interface LocalProduct {
    id: string;
    slug: string;
    title: { ru: string; en: string };
    ozonOfferId?: string;
    image?: string | null;
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
                                            <div className="flex items-start gap-3">
                                                {op.image ? (
                                                    <div className="relative group flex-shrink-0">
                                                        <img src={op.image} alt="" className="w-12 h-12 object-cover rounded-md border border-gray-200" />
                                                        <div className="absolute left-full top-0 ml-4 z-[60] hidden group-hover:block bg-white p-2 rounded-xl shadow-2xl border border-gray-200 pointer-events-none w-[272px]">
                                                            <img src={op.image} alt="" className="w-64 h-64 object-cover rounded-lg max-w-none" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 rounded-md border border-gray-200 flex-shrink-0 flex items-center justify-center text-gray-400 text-[10px]">Нет фото</div>
                                                )}
                                                <div>
                                                    <a href={`https://www.ozon.ru/context/detail/id/${op.sku}/`} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:text-blue-600 transition-colors mb-1 block">
                                                        {op.name}
                                                    </a>
                                                    <div className="text-[11px] text-gray-500 font-mono bg-gray-100 inline-block px-1.5 py-0.5 rounded">
                                                        {locale === 'ru' ? 'Артикул:' : 'SKU:'} {op.offerId}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 relative">
                                            {saving[op.offerId] && (
                                                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-md">
                                                    <RefreshCw size={20} className="animate-spin text-blue-500" />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 w-full max-w-sm">
                                                <SearchableSelect 
                                                    localProducts={localProducts}
                                                    mappedLocal={mappedLocal}
                                                    onMap={(id) => handleMap(op.offerId, id)}
                                                    locale={locale}
                                                />
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

function SearchableSelect({ 
    localProducts, 
    mappedLocal, 
    onMap, 
    locale 
}: { 
    localProducts: LocalProduct[]; 
    mappedLocal?: LocalProduct; 
    onMap: (id: string) => void; 
    locale: string; 
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedName = mappedLocal ? (mappedLocal.title.ru || mappedLocal.title.en) : '';
    const filtered = localProducts.filter(lp => 
        (lp.title.ru || lp.title.en || '').toLowerCase().includes(search.toLowerCase()) ||
        (lp.slug || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative flex-1">
            {open && (
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            )}
            <div 
                className={`p-2 border rounded-md text-sm cursor-pointer flex justify-between items-center relative z-40 ${mappedLocal ? 'bg-green-50 border-green-200 text-green-900' : 'bg-gray-50 border-gray-200'}`}
                onClick={() => setOpen(!open)}
            >
                <div className="flex items-center flex-1 min-w-0 mr-2">
                    {mappedLocal?.image && (
                        <div className="relative group flex-shrink-0 mr-2">
                            <img src={mappedLocal.image} alt="" className="w-6 h-6 object-cover rounded shadow-sm" />
                            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 z-[60] hidden group-hover:block bg-white p-2 rounded-xl shadow-2xl border border-gray-200 pointer-events-none w-[272px]">
                                <img src={mappedLocal.image} alt="" className="w-64 h-64 object-cover rounded-lg max-w-none" />
                            </div>
                        </div>
                    )}
                    <span className="truncate block max-w-[200px] sm:max-w-[250px]">
                        {selectedName || (locale === 'ru' ? '-- Не связан --' : '-- Not mapped --')}
                    </span>
                </div>
                <ChevronDown size={14} className="opacity-50 flex-shrink-0" />
            </div>
            
            {open && (
                <div className="absolute top-full left-0 min-w-full w-[350px] mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50">
                    <div className="p-2 border-b bg-gray-50">
                        <input 
                            type="text" 
                            autoFocus
                            placeholder={locale === 'ru' ? 'Поиск товара...' : 'Search...'}
                            className="w-full p-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        <div 
                            className="p-2 text-sm hover:bg-gray-100 cursor-pointer text-gray-500 font-medium"
                            onClick={() => { onMap(''); setOpen(false); setSearch(''); }}
                        >
                            {locale === 'ru' ? '-- Отвязать товар --' : '-- Unlink --'}
                        </div>
                        {filtered.length === 0 && (
                            <div className="p-3 text-sm text-gray-400 text-center">
                                {locale === 'ru' ? 'Ничего не найдено' : 'No results'}
                            </div>
                        )}
                        {filtered.map(lp => (
                            <div 
                                key={lp.id}
                                className="p-2 text-sm hover:bg-blue-50 cursor-pointer border-t border-gray-50 flex items-center gap-3"
                                onClick={() => { onMap(lp.id); setOpen(false); setSearch(''); }}
                            >
                                {lp.image ? (
                                    <div className="relative group flex-shrink-0">
                                        <img src={lp.image} alt="" className="w-8 h-8 object-cover rounded" />
                                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60] hidden group-hover:block bg-white p-2 rounded-xl shadow-2xl border border-gray-200 pointer-events-none w-[272px]">
                                            <img src={lp.image} alt="" className="w-64 h-64 object-cover rounded-lg max-w-none" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 bg-gray-200 rounded flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-gray-900 truncate">{lp.title.ru || lp.title.en}</div>
                                    <div className="text-xs text-gray-400 truncate">{lp.slug}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
