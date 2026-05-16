'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, Save } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface InventoryItem {
    offerId: string;
    name: string;
    stock: number;
}

export default function OzonInventoryTab() {
    const { locale } = useTranslation();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/inventory');
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (err) {
            console.error('Failed to fetch inventory:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleStockChange = (offerId: string, val: string) => {
        const num = parseInt(val, 10);
        if (isNaN(num)) return;
        setItems(prev => prev.map(item => item.offerId === offerId ? { ...item, stock: num } : item));
    };

    const saveStock = async (item: InventoryItem) => {
        setSaving(prev => ({ ...prev, [item.offerId]: true }));
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
            });
            if (!res.ok) throw new Error('Failed to save');
        } catch (err) {
            alert(locale === 'ru' ? 'Ошибка сохранения' : 'Save error');
        } finally {
            setSaving(prev => ({ ...prev, [item.offerId]: false }));
        }
    };

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.offerId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-auto rounded-xl border bg-white shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center flex-shrink-0 bg-gray-50/50">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder={locale === 'ru' ? 'Поиск по артикулу или названию...' : 'Search by SKU or name...'}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-500"
                    />
                </div>
                <button
                    onClick={fetchInventory}
                    disabled={loading}
                    className="admin-btn-secondary"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {locale === 'ru' ? 'Обновить' : 'Refresh'}
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <p className="text-lg font-medium">{locale === 'ru' ? 'Товары не найдены' : 'No items found'}</p>
                        <p className="text-sm mt-1 max-w-md text-center">
                            {locale === 'ru' ? 'Сюда автоматически добавляются товары из новых заказов Ozon. Вы также можете обновить список заказов, чтобы подтянуть новые товары.' : 'Items from new Ozon orders will appear here automatically.'}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-white shadow-sm">
                            <tr>
                                <th className="text-left px-4 py-3">{locale === 'ru' ? 'Артикул (offer_id)' : 'SKU (offer_id)'}</th>
                                <th className="text-left px-4 py-3">{locale === 'ru' ? 'Название товара' : 'Product Name'}</th>
                                <th className="text-center px-4 py-3 w-48">{locale === 'ru' ? 'В наличии (шт)' : 'In stock (pcs)'}</th>
                                <th className="w-24"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => (
                                <tr key={item.offerId} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{item.offerId}</td>
                                    <td className="px-4 py-3 text-gray-800">{item.name}</td>
                                    <td className="px-4 py-3 text-center">
                                        <input 
                                            type="number" 
                                            value={item.stock}
                                            onChange={e => handleStockChange(item.offerId, e.target.value)}
                                            className="w-20 px-2 py-1 text-center border rounded-md"
                                            min="0"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => saveStock(item)}
                                            disabled={saving[item.offerId]}
                                            className="text-blue-600 hover:text-blue-800 p-1.5 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
                                            title={locale === 'ru' ? 'Сохранить' : 'Save'}
                                        >
                                            {saving[item.offerId] ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
