'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { RefreshCw, Search, ChevronDown, ChevronUp, ExternalLink, Package, ChevronLeft, ChevronRight, Printer, LayoutList, LayoutGrid, Archive, Link as LinkIcon, Gift } from 'lucide-react';
import OzonInventoryTab from './OzonInventoryTab';
import OzonMappingTab from './OzonMappingTab';

interface OzonProduct {
    name: string;
    sku: number;
    quantity: number;
    offerId: string;
    price: string;
    currencyCode: string;
    barcode?: string;
    stockCount?: number;
}

interface OzonOrder {
    postingNumber: string;
    orderId: number;
    orderNumber: string;
    status: string;
    statusLabel: string;
    statusLabelEn: string;
    statusColor: string;
    statusEmoji: string;
    createdAt: string;
    inProcessAt: string;
    shipmentDate: string;
    deliveringDate: string;
    products: OzonProduct[];
    total: number;
    payout: number;
    commissionAmount: number;
    commissionPercent: number;
    deliveryMethod: { name: string; warehouse: string; tplProvider: string } | null;
    addressee: { name: string; phone: string } | null;
    customer: { name: string | null; phone: string; address: string | null; city: string | null } | null;
    cancellation: { cancellationReason: string; cancellationType: string } | null;
}

const STATUS_FILTERS = [
    { value: 'all', label: 'Все', labelEn: 'All' },
    { value: 'awaiting_packaging', label: '⏳ Ожидает сборки', labelEn: '⏳ Awaiting Packaging' },
    { value: 'awaiting_deliver', label: '📦 Готов к отгрузке', labelEn: '📦 Awaiting Delivery' },
    { value: 'delivering', label: '🚚 Доставляется', labelEn: '🚚 Delivering' },
    { value: 'delivered', label: '✅ Доставлен', labelEn: '✅ Delivered' },
    { value: 'cancelled', label: '❌ Отменён', labelEn: '❌ Cancelled' },
    { value: 'arbitration', label: '⚠️ Арбитраж', labelEn: '⚠️ Arbitration' },
];

const PERIOD_OPTIONS = [
    { value: 1, label: 'Сегодня', labelEn: 'Today' },
    { value: 2, label: 'Вчера + сегодня', labelEn: 'Yesterday + today' },
    { value: 3, label: '3 дня', labelEn: '3 days' },
    { value: 7, label: 'Неделя', labelEn: 'Week' },
    { value: 14, label: '2 недели', labelEn: '2 weeks' },
    { value: 30, label: 'Месяц', labelEn: 'Month' },
    { value: 90, label: '3 месяца', labelEn: '3 months' },
];

const PAGE_SIZE = 30;

export default function OzonOrdersPage() {
    const { locale } = useTranslation();
    const [orders, setOrders] = useState<OzonOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
    const [statusFilter, setStatusFilter] = useState('all');
    const [days, setDays] = useState(7);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [globalCouponLoading, setGlobalCouponLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'mapping'>('orders');

    const handlePrintGlobalCoupon = async () => {
        setGlobalCouponLoading(true);
        try {
            const res = await fetch('/api/admin/promos/generate-slip', { method: 'POST' });
            if (!res.ok) throw new Error('Ошибка создания купона');
            const data = await res.json();
            const code = data.code;
            
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Купон ${code}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Inter', sans-serif; background: #fff; color: #000; }
    .toolbar {
        display: flex; align-items: center; justify-content: center; gap: 12px;
        padding: 15px; background: #1e1d2b; color: white; width: 100%;
        position: fixed; top: 0; z-index: 10;
    }
    .toolbar button {
        padding: 8px 20px; background: #3b82f6; color: white;
        border: none; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 14px;
    }
    
    .label-container {
        width: 56mm; 
        height: 38mm; 
        margin: 80px auto 20px; 
        border: 1px dashed #ccc;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1mm 2mm;
        overflow: hidden;
    }
    
    .qr-side {
        width: 40%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    
    .qr { width: 22mm; height: 22mm; object-fit: contain; margin-bottom: 2px; } 
    .qr-text { font-size: 9px; font-weight: 700; text-align: center; line-height: 1.1; }
    
    .text-side {
        width: 60%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    
    .title { font-size: 14px; font-weight: 900; line-height: 1; margin-bottom: 3px; }
    .subtitle { font-size: 11px; font-weight: 700; line-height: 1.1; margin-bottom: 6px; }
    .code-box {
        font-size: 12px; font-weight: 800; padding: 4px 6px; 
        border: 1.5px solid #000; border-radius: 4px; font-family: monospace;
        display: inline-block; margin-bottom: 5px;
        background: #000; color: #fff;
    }
    .desc { font-size: 9px; line-height: 1.1; font-weight: 500; }
    
    @media print {
        .toolbar { display: none !important; }
        .label-container { margin: 0; border: none; padding: 1mm; width: 58mm; height: 40mm; }
        body { margin: 0; }
        @page { margin: 0; size: 58mm 40mm; } 
    }
</style>
</head>
<body>
    <div class="toolbar">
        <button onclick="window.print()">🖨️ Печать купона</button>
        <span style="font-size: 12px; color: #fbbf24; margin-left: 10px;">В настройках выберите "Поля: Нет"</span>
    </div>
    <div class="label-container">
        <div class="qr-side">
            <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=https://somanatha.ru/?promo=${code}" />
            <div class="qr-text">Наведи камеру</div>
        </div>
        <div class="text-side">
            <div class="title">СПАСИБО ЗА ЗАКАЗ</div>
            <div class="subtitle">Дарим скидку 15%</div>
            <div class="code-box">${code}</div>
            <div class="desc">somanatha.ru</div>
        </div>
    </div>
</body></html>`);
                printWindow.document.close();
            }
        } catch (err) {
            console.error('Coupon generation error:', err);
            alert('Не удалось сгенерировать купон');
        } finally {
            setGlobalCouponLoading(false);
        }
    };

    const fetchOrders = useCallback(async (currentOffset = 0, isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                status: statusFilter,
                days: String(days),
                offset: String(currentOffset),
                limit: String(PAGE_SIZE),
            });
            const res = await fetch(`/api/ozon-orders?${params}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            setOrders(data.orders || []);
            setHasNext(data.hasNext || false);
            setOffset(currentOffset);
        } catch (err: any) {
            console.error('Failed to fetch Ozon orders:', err);
            setError(err.message || 'Ошибка загрузки');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter, days]);

    useEffect(() => {
        fetchOrders(0);
    }, [fetchOrders]);

    // Priority: actionable statuses first, then in-transit, then completed/cancelled
    const STATUS_PRIORITY: Record<string, number> = {
        awaiting_packaging: 0,
        awaiting_deliver: 1,
        awaiting_approve: 2,
        awaiting_registration: 3,
        acceptance_in_progress: 4,
        sent_by_seller: 5,
        driver_pickup: 6,
        delivering: 7,
        delivered: 8,
        arbitration: 9,
        client_arbitration: 10,
        cancelled: 11,
        not_accepted: 12,
    };

    const filteredOrders = orders
        .filter(o => {
            if (!searchTerm) return true;
            const q = searchTerm.toLowerCase();
            return (
                o.postingNumber.toLowerCase().includes(q) ||
                o.products.some(p => p.name.toLowerCase().includes(q) || p.offerId.toLowerCase().includes(q))
            );
        })
        .sort((a, b) => {
            const pa = STATUS_PRIORITY[a.status] ?? 99;
            const pb = STATUS_PRIORITY[b.status] ?? 99;
            if (pa !== pb) return pa - pb;
            // Within same priority, newest first
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatPrice = (val: number) => {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
    };

    // Stats
    const statCounts: Record<string, number> = {};
    orders.forEach(o => { statCounts[o.status] = (statCounts[o.status] || 0) + 1; });

    return (
        <div className="flex flex-col h-[calc(100vh-40px)]">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3 flex-shrink-0">
                <div className="flex flex-wrap items-center gap-4">
                    <h1 className="admin-page-title flex items-center gap-2 mb-0">
                        <span className="text-blue-600">OZON</span>
                    </h1>
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Package size={16} />
                            <span className="hidden sm:inline">{locale === 'ru' ? 'Заказы' : 'Orders'}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Archive size={16} />
                            <span className="hidden sm:inline">{locale === 'ru' ? 'Склад (Наличие)' : 'Inventory'}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('mapping')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'mapping' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <LinkIcon size={16} />
                            <span className="hidden sm:inline">{locale === 'ru' ? 'Связка товаров' : 'Product Mapping'}</span>
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 justify-end">
                    <button
                        onClick={handlePrintGlobalCoupon}
                        disabled={globalCouponLoading}
                        className="admin-btn-secondary flex items-center gap-2 border-0 bg-purple-600 hover:bg-purple-700 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all"
                    >
                        {globalCouponLoading ? <RefreshCw size={16} className="animate-spin" /> : <Gift size={16} />}
                        <span className="hidden sm:inline">{locale === 'ru' ? 'Сгенерировать купон' : 'Generate Promo'}</span>
                    </button>
                    {activeTab === 'orders' && (
                        <div className="flex items-center gap-2">
                            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                                <button
                                    onClick={() => setViewMode('simple')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'simple' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <LayoutGrid size={16} />
                                    <span className="hidden sm:inline">{locale === 'ru' ? 'Простой' : 'Simple'}</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('advanced')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'advanced' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <LayoutList size={16} />
                                    <span className="hidden sm:inline">{locale === 'ru' ? 'Расширенный' : 'Advanced'}</span>
                                </button>
                            </div>
                            <button
                                onClick={() => fetchOrders(offset, true)}
                                disabled={refreshing}
                                className="admin-btn-secondary"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">{locale === 'ru' ? 'Обновить' : 'Refresh'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'mapping' ? (
                <OzonMappingTab />
            ) : activeTab === 'inventory' ? (
                <OzonInventoryTab />
            ) : (
                <>
                {/* Filters */}
            {viewMode === 'advanced' && (
                <div className="flex flex-wrap gap-3 mb-4 flex-shrink-0">
                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm font-medium bg-white text-gray-800"
                    >
                        {STATUS_FILTERS.map(sf => (
                            <option key={sf.value} value={sf.value}>
                                {locale === 'ru' ? sf.label : sf.labelEn}
                            </option>
                        ))}
                    </select>

                    {/* Period filter */}
                    <select
                        value={days}
                        onChange={e => setDays(Number(e.target.value))}
                        className="px-3 py-2 border rounded-lg text-sm font-medium bg-white text-gray-800"
                    >
                        {PERIOD_OPTIONS.map(po => (
                            <option key={po.value} value={po.value}>
                                {locale === 'ru' ? po.label : po.labelEn}
                            </option>
                        ))}
                    </select>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder={locale === 'ru' ? 'Поиск по номеру или товару...' : 'Search by number or product...'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-500"
                        />
                    </div>

                    {/* Stat badges */}
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs font-medium text-gray-500">
                            {locale === 'ru' ? `Найдено: ${filteredOrders.length}` : `Found: ${filteredOrders.length}`}
                        </span>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex-shrink-0">
                    <strong>{locale === 'ru' ? 'Ошибка:' : 'Error:'}</strong> {error}
                    <p className="text-xs text-red-600 mt-1">
                        {locale === 'ru' ? 'Проверьте OZON_CLIENT_ID и OZON_API_KEY в настройках.' : 'Check OZON_CLIENT_ID and OZON_API_KEY in settings.'}
                    </p>
                </div>
            )}

            {/* Main Content Area */}
            {viewMode === 'simple' ? (
                <div className="flex-1 overflow-auto rounded-xl">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse border border-gray-200" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                            {filteredOrders
                                .filter(o => ['awaiting_packaging', 'awaiting_deliver', 'awaiting_approve'].includes(o.status))
                                .map(order => (
                                    <SimpleOrderCard key={order.postingNumber} order={order} locale={locale} />
                                ))
                            }
                            {filteredOrders.filter(o => ['awaiting_packaging', 'awaiting_deliver', 'awaiting_approve'].includes(o.status)).length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                    <Package size={48} className="mb-3 opacity-50 text-green-500" />
                                    <p className="text-lg font-medium">{locale === 'ru' ? 'Все заказы отправлены!' : 'All orders shipped!'}</p>
                                    <p className="text-sm mt-1">{locale === 'ru' ? 'Нет заказов, ожидающих сборки или отгрузки.' : 'No orders awaiting packaging or delivery.'}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 overflow-auto rounded-xl border bg-white shadow-sm">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Package size={48} className="mb-3 opacity-50" />
                            <p className="text-lg font-medium">{locale === 'ru' ? 'Заказов не найдено' : 'No orders found'}</p>
                            <p className="text-sm mt-1">{locale === 'ru' ? 'Попробуйте изменить фильтры' : 'Try changing filters'}</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                <tr>
                                    <th className="text-left px-4 py-3">
                                        {locale === 'ru' ? 'Отправление' : 'Posting'}
                                    </th>
                                    <th className="text-left px-4 py-3">
                                        {locale === 'ru' ? 'Дата' : 'Date'}
                                    </th>
                                    <th className="text-left px-4 py-3">
                                        {locale === 'ru' ? 'Товары' : 'Products'}
                                    </th>
                                    <th className="text-right px-4 py-3">
                                        {locale === 'ru' ? 'Продажа' : 'Sale'}
                                    </th>
                                    <th className="text-right px-4 py-3 hidden md:table-cell">
                                        {locale === 'ru' ? 'К выплате' : 'Payout'}
                                    </th>
                                    <th className="text-left px-4 py-3">
                                        {locale === 'ru' ? 'Статус' : 'Status'}
                                    </th>
                                    <th className="text-left px-4 py-3 hidden lg:table-cell">
                                        {locale === 'ru' ? 'Доставка' : 'Delivery'}
                                    </th>
                                    <th className="w-10 px-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => {
                                    const isExpanded = expandedRow === order.postingNumber;
                                    return (
                                        <OzonOrderRow
                                            key={order.postingNumber}
                                            order={order}
                                            isExpanded={isExpanded}
                                            onToggle={() => setExpandedRow(isExpanded ? null : order.postingNumber)}
                                            formatDate={formatDate}
                                            formatPrice={formatPrice}
                                            locale={locale}
                                        />
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Pagination */}
            {!loading && (offset > 0 || hasNext) && (
                <div className="flex justify-between items-center mt-3 flex-shrink-0 pb-2">
                    <button
                        onClick={() => fetchOrders(Math.max(0, offset - PAGE_SIZE))}
                        disabled={offset === 0}
                        className="admin-btn-secondary text-sm disabled:opacity-40"
                    >
                        <ChevronLeft size={16} />
                        {locale === 'ru' ? 'Назад' : 'Previous'}
                    </button>
                    <span className="text-xs text-gray-500">
                        {locale === 'ru' ? `Страница ${Math.floor(offset / PAGE_SIZE) + 1}` : `Page ${Math.floor(offset / PAGE_SIZE) + 1}`}
                    </span>
                    <button
                        onClick={() => fetchOrders(offset + PAGE_SIZE)}
                        disabled={!hasNext}
                        className="admin-btn-secondary text-sm disabled:opacity-40"
                    >
                        {locale === 'ru' ? 'Далее' : 'Next'}
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
            </>
            )}
        </div>
    );
}

/* ─── Shared Print Utility ─── */
const handlePrintProductBarcode = (productName: string, barcode: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Штрихкод ${barcode}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Inter', sans-serif; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    .toolbar {
        display: flex; align-items: center; justify-content: center; gap: 12px;
        padding: 15px; background: #1e1d2b; color: white; width: 100%;
        position: fixed; top: 0; z-index: 10;
    }
    .toolbar button {
        padding: 8px 20px; background: #3b82f6; color: white;
        border: none; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 14px;
    }
    .toolbar button:hover { background: #2563eb; }
    .content { margin-top: 80px; padding: 20px; max-width: 100%; display: flex; flex-direction: column; align-items: center; }
    .product-name { font-size: 14px; color: #333; margin-bottom: 10px; max-width: 58mm; word-wrap: break-word; }
    svg { max-width: 100%; height: auto; }
    
    @media print {
        .toolbar { display: none !important; }
        .content { margin-top: 0; padding: 0; }
        @page { margin: 0; size: auto; }
    }
</style>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
</head>
<body>
    <div class="toolbar">
        <button onclick="window.print()">🖨️ Печать</button>
        <span style="font-size: 12px; color: #fbbf24; background: rgba(251,191,36,0.1); padding: 4px 8px; border-radius: 4px;">Формат: 58x40 (термо) или А4</span>
    </div>
    <div class="content">
        <div class="product-name">${productName}</div>
        <svg id="barcode"></svg>
    </div>
    <script>
        JsBarcode("#barcode", "${barcode}", {
            format: "CODE128",
            displayValue: true,
            fontSize: 16,
            height: 60,
            margin: 0
        });
    </script>
</body></html>`);
        printWindow.document.close();
    }
};

/* ─── Simple Order Card Component ─── */
function SimpleOrderCard({ order, locale }: { order: OzonOrder; locale: string }) {
    const [labelLoading, setLabelLoading] = useState(false);
    const [labelError, setLabelError] = useState<string | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [shipLoading, setShipLoading] = useState(false);
    const [shipError, setShipError] = useState<string | null>(null);
    const [isPacked, setIsPacked] = useState(false);
    const [deducting, setDeducting] = useState<Record<string, boolean>>({});
    const [localStock, setLocalStock] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        order.products.forEach(p => {
            initial[p.offerId] = p.stockCount || 0;
        });
        return initial;
    });

    useEffect(() => {
        setIsPacked(localStorage.getItem(`ozon_packed_${order.postingNumber}`) === 'true');
    }, [order.postingNumber]);

    const togglePacked = () => {
        const nextState = !isPacked;
        setIsPacked(nextState);
        if (nextState) {
            localStorage.setItem(`ozon_packed_${order.postingNumber}`, 'true');
        } else {
            localStorage.removeItem(`ozon_packed_${order.postingNumber}`);
        }
    };

    const handleDeduct = async (e: React.MouseEvent, p: OzonProduct) => {
        e.preventDefault();
        setDeducting(prev => ({ ...prev, [p.offerId]: true }));
        try {
            const res = await fetch('/api/inventory/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerId: p.offerId, name: p.name, quantity: p.quantity })
            });
            if (res.ok) {
                setLocalStock(prev => ({ ...prev, [p.offerId]: (prev[p.offerId] || 0) - p.quantity }));
            } else {
                alert('Недостаточно товара или ошибка списания');
            }
        } catch (error) {
            console.error('Deduct error:', error);
        } finally {
            setDeducting(prev => ({ ...prev, [p.offerId]: false }));
        }
    };

    const handleShipOrder = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(locale === 'ru' ? 'Собрать этот заказ и отправить данные в Озон? Все товары будут упакованы в одну коробку.' : 'Pack this order and send to Ozon? All items will be packed in one box.')) return;
        
        setShipLoading(true);
        setShipError(null);
        try {
            const res = await fetch('/api/ozon-orders/ship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    posting_number: order.postingNumber,
                    products: order.products 
                })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.details || `HTTP ${res.status}`);
            }
            alert(locale === 'ru' ? 'Заказ успешно собран! Обновите страницу.' : 'Order packed successfully! Refresh the page.');
        } catch (err: any) {
            setShipError(err.message || 'Ошибка');
            setTimeout(() => setShipError(null), 5000);
        } finally {
            setShipLoading(false);
        }
    };

    const handlePrintLabel = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setLabelLoading(true);
        setLabelError(null);
        try {
            const res = await fetch(`/api/ozon-label?posting=${encodeURIComponent(order.postingNumber)}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            const productsHtml = order.products.map(p => {
                const safeName = p.name.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const skuInfo = p.offerId ? `<span class="product-sku">${p.offerId}</span>` : '';
                return `<div class="product-badge">
                    <span class="product-qty">${p.quantity} шт</span>
                    <span class="product-name" title="${safeName}">${safeName}</span>
                    ${skuInfo}
                </div>`;
            }).join('');

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Этикетка ${order.postingNumber}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Inter', sans-serif; background: #f5f5f5; }
    .toolbar { display: flex; align-items: center; gap: 12px; padding: 10px 20px; background: #1e1d2b; color: white; position: sticky; top: 0; z-index: 10; }
    .toolbar button { padding: 8px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .toolbar button:hover { background: #2563eb; }
    .toolbar .num { font-size: 13px; font-family: monospace; color: #d1d5db; flex-shrink: 0; }
    .products-list {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-grow: 1;
        overflow-x: auto;
        padding-bottom: 2px;
        margin: 0 10px;
    }
    .products-list::-webkit-scrollbar {
        height: 4px;
    }
    .products-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.02);
    }
    .products-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 2px;
    }
    .product-badge {
        background: rgba(255, 255, 255, 0.08);
        padding: 4px 8px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: #e5e7eb;
        white-space: nowrap;
        flex-shrink: 0;
    }
    .product-qty {
        font-weight: 700;
        color: #60a5fa;
        background: rgba(96, 165, 250, 0.15);
        padding: 1px 5px;
        border-radius: 3px;
        font-family: monospace;
    }
    .product-name {
        max-width: 200px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .product-sku {
        font-size: 10px;
        color: #9ca3af;
        background: rgba(255, 255, 255, 0.05);
        padding: 1px 4px;
        border-radius: 3px;
        font-family: monospace;
    }
    .tip { margin-left: auto; font-size: 11px; color: #fbbf24; background: rgba(251, 191, 36, 0.1); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(251, 191, 36, 0.2); flex-shrink: 0; }
    iframe { width: 100%; height: calc(100vh - 50px); border: none; }
    @media print { .toolbar { display: none !important; } iframe { height: 100vh; } }
</style></head>
<body>
    <div class="toolbar">
        <button onclick="try{document.getElementById('pdf').contentWindow.print()}catch(e){window.print()}">🖨️ Печать</button>
        <span class="num">${order.postingNumber}</span>
        <div class="products-list">
            ${productsHtml}
        </div>
        <span class="tip">💡 Выберите «По размеру страницы» в настройках печати</span>
    </div>
    <iframe id="pdf" src="${url}#view=Fit"></iframe>
</body></html>`);
                printWindow.document.close();
            }
        } catch (err: any) {
            setLabelError(err.message || 'Ошибка');
            setTimeout(() => setLabelError(null), 5000);
        } finally {
            setLabelLoading(false);
        }
    };

    const handlePrintCoupon = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setCouponLoading(true);
        try {
            const res = await fetch('/api/admin/promos/generate-slip', { method: 'POST' });
            if (!res.ok) throw new Error('Ошибка создания купона');
            const data = await res.json();
            const code = data.code;
            
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Купон ${code}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Inter', sans-serif; background: #fff; color: #000; }
    .toolbar {
        display: flex; align-items: center; justify-content: center; gap: 12px;
        padding: 15px; background: #1e1d2b; color: white; width: 100%;
        position: fixed; top: 0; z-index: 10;
    }
    .toolbar button {
        padding: 8px 20px; background: #3b82f6; color: white;
        border: none; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 14px;
    }
    
    .label-container {
        width: 56mm; 
        height: 38mm; 
        margin: 80px auto 20px; 
        border: 1px dashed #ccc;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1mm 2mm;
        overflow: hidden;
    }
    
    .qr-side {
        width: 40%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    
    .qr { width: 22mm; height: 22mm; object-fit: contain; margin-bottom: 2px; } 
    .qr-text { font-size: 9px; font-weight: 700; text-align: center; line-height: 1.1; }
    
    .text-side {
        width: 60%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    
    .title { font-size: 14px; font-weight: 900; line-height: 1; margin-bottom: 3px; }
    .subtitle { font-size: 11px; font-weight: 700; line-height: 1.1; margin-bottom: 6px; }
    .code-box {
        font-size: 12px; font-weight: 800; padding: 4px 6px; 
        border: 1.5px solid #000; border-radius: 4px; font-family: monospace;
        display: inline-block; margin-bottom: 5px;
        background: #000; color: #fff;
    }
    .desc { font-size: 9px; line-height: 1.1; font-weight: 500; }
    
    @media print {
        .toolbar { display: none !important; }
        .label-container { margin: 0; border: none; padding: 1mm; width: 58mm; height: 40mm; }
        body { margin: 0; }
        @page { margin: 0; size: 58mm 40mm; } 
    }
</style>
</head>
<body>
    <div class="toolbar">
        <button onclick="window.print()">🖨️ Печать купона</button>
        <span style="font-size: 12px; color: #fbbf24; margin-left: 10px;">В настройках выберите "Поля: Нет"</span>
    </div>
    <div class="label-container">
        <div class="qr-side">
            <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=https://somanatha.ru/?promo=${code}" />
            <div class="qr-text">Наведи камеру</div>
        </div>
        <div class="text-side">
            <div class="title">СПАСИБО ЗА ЗАКАЗ</div>
            <div class="subtitle">Дарим скидку 15%</div>
            <div class="code-box">${code}</div>
            <div class="desc">somanatha.ru</div>
        </div>
    </div>
</body></html>`);
                printWindow.document.close();
            }
        } catch (err) {
            console.error('Coupon generation error:', err);
            alert('Не удалось сгенерировать купон');
        } finally {
            setCouponLoading(false);
        }
    };

    return (
        <div className={`rounded-xl shadow-sm border overflow-hidden flex flex-col transition-colors ${isPacked ? 'bg-green-50/40 border-green-200' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 border-b flex justify-between items-start ${isPacked ? 'bg-green-100/40 border-green-100' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className="flex items-start gap-3">
                    <input 
                        type="checkbox" 
                        checked={isPacked} 
                        onChange={togglePacked}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                        title={locale === 'ru' ? 'Отметить как собранный (для себя)' : 'Mark as packed (local)'}
                    />
                    <div>
                        <div className="font-mono text-sm font-bold text-gray-800">{order.postingNumber}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(order.inProcessAt || order.createdAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: `${order.statusColor}15`, color: order.statusColor, border: `1px solid ${order.statusColor}30` }}>
                    {order.statusEmoji} {locale === 'ru' ? order.statusLabel : order.statusLabelEn}
                </span>
            </div>
            
            <div className="p-4 flex-1 space-y-3">
                {order.products.map((p, i) => {
                    const currentStock = localStock[p.offerId] || 0;
                    const isReady = currentStock >= p.quantity;
                    return (
                        <div key={i} className="flex flex-col mb-4 last:mb-0 border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0 pr-3">
                                    <a href={`https://www.ozon.ru/context/detail/id/${p.sku}/`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-blue-600 transition-colors">
                                        {p.name}
                                    </a>
                                    <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                                        {p.barcode ? (
                                            <button 
                                                onClick={(e) => { e.preventDefault(); handlePrintProductBarcode(p.name, p.barcode!); }}
                                                className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors border border-blue-100 font-medium"
                                            >
                                                <Printer size={12} /> {locale === 'ru' ? 'Штрихкод' : 'Barcode'}: {p.barcode}
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-gray-400 font-mono">SKU: {p.sku}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                    <div className="text-xs font-semibold text-gray-700">{p.quantity} шт</div>
                                </div>
                            </div>
                            
                            {/* Inventory Status */}
                            <div className="flex items-center justify-between mt-1 bg-gray-50 rounded px-2 py-1.5">
                                <span className={`text-[11px] font-medium flex items-center gap-1 ${isReady ? 'text-green-600' : 'text-amber-600'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                    {isReady ? (locale === 'ru' ? `Готовый товар (${currentStock} шт)` : `Ready item (${currentStock} pcs)`) 
                                             : (locale === 'ru' ? `Требуется изготовление (В наличии: ${currentStock})` : `Needs manufacturing (In stock: ${currentStock})`)}
                                </span>
                                {isReady && (
                                    <button 
                                        onClick={(e) => handleDeduct(e, p)}
                                        disabled={deducting[p.offerId]}
                                        className="text-[11px] bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded transition-colors disabled:opacity-50 border border-green-200 font-medium"
                                    >
                                        {deducting[p.offerId] ? '...' : (locale === 'ru' ? 'Списать' : 'Deduct')}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto">
                {labelError && <div className="text-xs text-red-600 mb-2">{labelError}</div>}
                {shipError && <div className="text-xs text-red-600 mb-2">{shipError}</div>}
                
                <div className="flex flex-col gap-2">
                    {order.status === 'awaiting_packaging' && (
                        <button
                            onClick={handleShipOrder}
                            disabled={shipLoading}
                            className="w-full flex justify-center items-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-70 shadow-sm"
                        >
                            {shipLoading ? (
                                <RefreshCw size={16} className="animate-spin" />
                            ) : (
                                <Package size={16} />
                            )}
                            {locale === 'ru' ? 'Собрать для Озон' : 'Pack for Ozon'}
                        </button>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrintLabel}
                            disabled={labelLoading}
                            className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-70 shadow-sm"
                        >
                            {labelLoading ? <RefreshCw size={16} className="animate-spin" /> : <Printer size={16} />}
                            {locale === 'ru' ? 'Этикетка' : 'Label'}
                        </button>
                        <button
                            onClick={handlePrintCoupon}
                            disabled={couponLoading}
                            className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-70 shadow-sm"
                        >
                            {couponLoading ? <RefreshCw size={16} className="animate-spin" /> : <Gift size={16} />}
                            {locale === 'ru' ? 'Купон (15%)' : 'Promo (15%)'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Order Row Component ─── */
function OzonOrderRow({ order, isExpanded, onToggle, formatDate, formatPrice, locale }: {
    order: OzonOrder;
    isExpanded: boolean;
    onToggle: () => void;
    formatDate: (s: string) => string;
    formatPrice: (n: number) => string;
    locale: string;
}) {
    const [labelLoading, setLabelLoading] = useState(false);
    const [labelError, setLabelError] = useState<string | null>(null);
    const [deducting, setDeducting] = useState<Record<string, boolean>>({});
    const [localStock, setLocalStock] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        order.products.forEach(p => {
            initial[p.offerId] = p.stockCount || 0;
        });
        return initial;
    });

    const handleDeduct = async (e: React.MouseEvent, p: OzonProduct) => {
        e.preventDefault();
        setDeducting(prev => ({ ...prev, [p.offerId]: true }));
        try {
            const res = await fetch('/api/inventory/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerId: p.offerId, name: p.name, quantity: p.quantity })
            });
            if (res.ok) {
                setLocalStock(prev => ({ ...prev, [p.offerId]: (prev[p.offerId] || 0) - p.quantity }));
            } else {
                alert('Недостаточно товара или ошибка списания');
            }
        } catch (error) {
            console.error('Deduct error:', error);
        } finally {
            setDeducting(prev => ({ ...prev, [p.offerId]: false }));
        }
    };

    const handlePrintLabel = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setLabelLoading(true);
        setLabelError(null);
        try {
            const res = await fetch(`/api/ozon-label?posting=${encodeURIComponent(order.postingNumber)}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            const productsHtml = order.products.map(p => {
                const safeName = p.name.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const skuInfo = p.offerId ? `<span class="product-sku">${p.offerId}</span>` : '';
                return `<div class="product-badge">
                    <span class="product-qty">${p.quantity} шт</span>
                    <span class="product-name" title="${safeName}">${safeName}</span>
                    ${skuInfo}
                </div>`;
            }).join('');

            // Open a wrapper page with the PDF in an iframe + print controls
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Этикетка ${order.postingNumber}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Inter', sans-serif; background: #f5f5f5; }
    .toolbar {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 20px; background: #1e1d2b; color: white;
        position: sticky; top: 0; z-index: 10;
    }
    .toolbar button {
        padding: 8px 20px; background: #3b82f6; color: white;
        border: none; border-radius: 6px; font-weight: 700;
        cursor: pointer; font-size: 14px; display: flex;
        align-items: center; gap: 6px; flex-shrink: 0;
    }
    .toolbar button:hover { background: #2563eb; }
    .toolbar .num { font-size: 13px; font-family: monospace; color: #d1d5db; flex-shrink: 0; }
    .products-list {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-grow: 1;
        overflow-x: auto;
        padding-bottom: 2px;
        margin: 0 10px;
    }
    .products-list::-webkit-scrollbar {
        height: 4px;
    }
    .products-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.02);
    }
    .products-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 2px;
    }
    .product-badge {
        background: rgba(255, 255, 255, 0.08);
        padding: 4px 8px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: #e5e7eb;
        white-space: nowrap;
        flex-shrink: 0;
    }
    .product-qty {
        font-weight: 700;
        color: #60a5fa;
        background: rgba(96, 165, 250, 0.15);
        padding: 1px 5px;
        border-radius: 3px;
        font-family: monospace;
    }
    .product-name {
        max-width: 200px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .product-sku {
        font-size: 10px;
        color: #9ca3af;
        background: rgba(255, 255, 255, 0.05);
        padding: 1px 4px;
        border-radius: 3px;
        font-family: monospace;
    }
    .tip {
        margin-left: auto; font-size: 11px; color: #fbbf24;
        background: rgba(251, 191, 36, 0.1); padding: 6px 12px;
        border-radius: 6px; border: 1px solid rgba(251, 191, 36, 0.2); flex-shrink: 0;
    }
    iframe { width: 100%; height: calc(100vh - 50px); border: none; }
    @media print {
        .toolbar { display: none !important; }
        iframe { height: 100vh; }
    }
</style></head>
<body>
    <div class="toolbar">
        <button onclick="try{document.getElementById('pdf').contentWindow.print()}catch(e){window.print()}">
            🖨️ Печать
        </button>
        <span class="num">${order.postingNumber}</span>
        <div class="products-list">
            ${productsHtml}
        </div>
        <span class="tip">💡 Выберите «По размеру страницы» в настройках печати</span>
    </div>
    <iframe id="pdf" src="${url}#view=Fit"></iframe>
</body></html>`);
                printWindow.document.close();
            }
        } catch (err: any) {
            setLabelError(err.message || 'Ошибка');
            setTimeout(() => setLabelError(null), 5000);
        } finally {
            setLabelLoading(false);
        }
    };
    const productSummary = order.products.length === 1
        ? order.products[0].name
        : `${order.products.length} ${locale === 'ru' ? 'товаров' : 'items'}`;

    return (
        <>
            <tr
                onClick={onToggle}
                className="cursor-pointer hover:bg-gray-50/80 transition-colors border-b border-gray-100"
            >
                <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-gray-700">{order.postingNumber}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(order.inProcessAt || order.createdAt)}
                </td>
                <td className="px-4 py-3">
                    <div className="text-sm text-gray-800 truncate max-w-[250px]" title={productSummary}>
                        {productSummary}
                    </div>
                    {order.products.length === 1 && (
                        <div className="text-[10px] text-gray-400 font-mono">
                            SKU: {order.products[0].sku} × {order.products[0].quantity}
                        </div>
                    )}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {formatPrice(order.total)}
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell whitespace-nowrap">
                    {order.payout > 0 ? (
                        <span className="font-semibold text-green-700">{formatPrice(order.payout)}</span>
                    ) : order.total > 0 && order.status !== 'cancelled' ? (
                        <span className="text-gray-400 text-xs italic" title={locale === 'ru' ? 'Рассчитается после доставки' : 'Calculated after delivery'}>
                            ~{formatPrice(order.total * 0.8)}
                        </span>
                    ) : (
                        <span className="text-gray-400 text-xs">—</span>
                    )}
                </td>
                <td className="px-4 py-3">
                    <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                        style={{
                            backgroundColor: `${order.statusColor}15`,
                            color: order.statusColor,
                            border: `1px solid ${order.statusColor}30`,
                        }}
                    >
                        {order.statusEmoji} {locale === 'ru' ? order.statusLabel : order.statusLabelEn}
                    </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {order.customer?.city || order.deliveryMethod?.name || '—'}
                </td>
                <td className="px-2 py-3">
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </td>
            </tr>

            {/* Expanded details */}
            {isExpanded && (
                <tr className="bg-gray-50/50">
                    <td colSpan={8} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Products list */}
                            <div className="md:col-span-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    {locale === 'ru' ? 'Товары' : 'Products'}
                                </h4>
                                <div className="space-y-2">
                                    {order.products.map((p, i) => {
                                        const currentStock = localStock[p.offerId] || 0;
                                        const isReady = currentStock >= p.quantity;
                                        return (
                                        <div key={i} className="flex flex-col bg-white rounded-lg p-3 border border-gray-100">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <a href={`https://www.ozon.ru/context/detail/id/${p.sku}/`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 truncate hover:text-blue-600 transition-colors block">
                                                        {p.name}
                                                    </a>
                                                    <div className="text-[11px] text-gray-400 font-mono mt-0.5 flex flex-wrap items-center gap-3">
                                                        <span>SKU: {p.sku}</span>
                                                        <span>Арт: {p.offerId}</span>
                                                        {p.barcode && (
                                                            <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100 transition-colors" onClick={(e) => { e.stopPropagation(); handlePrintProductBarcode(p.name, p.barcode!); }} title="Печать штрихкода">
                                                                <Printer size={10} /> {p.barcode}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-3 flex-shrink-0">
                                                    <div className="text-sm font-semibold text-gray-900">{formatPrice(parseFloat(p.price) * p.quantity)}</div>
                                                    <div className="text-[11px] text-gray-400">× {p.quantity}</div>
                                                </div>
                                            </div>
                                            
                                            {/* Inventory Status */}
                                            <div className="flex items-center justify-between mt-2 bg-gray-50 rounded px-2 py-1.5">
                                                <span className={`text-[11px] font-medium flex items-center gap-1 ${isReady ? 'text-green-600' : 'text-amber-600'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                                    {isReady ? (locale === 'ru' ? `Готовый товар (${currentStock} шт)` : `Ready item (${currentStock} pcs)`) 
                                                             : (locale === 'ru' ? `Требуется изготовление (В наличии: ${currentStock})` : `Needs manufacturing (In stock: ${currentStock})`)}
                                                </span>
                                                {isReady && (
                                                    <button 
                                                        onClick={(e) => handleDeduct(e, p)}
                                                        disabled={deducting[p.offerId]}
                                                        className="text-[11px] bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded transition-colors disabled:opacity-50 border border-green-200 font-medium"
                                                    >
                                                        {deducting[p.offerId] ? '...' : (locale === 'ru' ? 'Списать' : 'Deduct')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>

                            {/* Order details */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    {locale === 'ru' ? 'Детали' : 'Details'}
                                </h4>
                                <div className="bg-white rounded-lg p-3 border border-gray-100 space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{locale === 'ru' ? 'Номер заказа' : 'Order ID'}:</span>
                                        <span className="font-mono font-medium text-gray-700">{order.orderNumber || order.orderId}</span>
                                    </div>
                                    {order.shipmentDate && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">{locale === 'ru' ? 'Дата отгрузки' : 'Shipment'}:</span>
                                            <span className="text-gray-700">{formatDate(order.shipmentDate)}</span>
                                        </div>
                                    )}
                                    {order.deliveryMethod && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">{locale === 'ru' ? 'Способ' : 'Method'}:</span>
                                            <span className="text-gray-700 text-right max-w-[150px] truncate">{order.deliveryMethod.name}</span>
                                        </div>
                                    )}
                                    {order.customer?.city && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">{locale === 'ru' ? 'Город' : 'City'}:</span>
                                            <span className="text-gray-700">{order.customer.city}</span>
                                        </div>
                                    )}
                                    {order.cancellation && (
                                        <div className="pt-2 border-t border-gray-100">
                                            <div className="text-red-600 font-medium">{locale === 'ru' ? 'Причина отмены' : 'Cancel reason'}:</div>
                                            <div className="text-red-500 mt-0.5">{order.cancellation.cancellationReason}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Financial summary */}
                                {order.payout > 0 && (
                                    <div className="bg-green-50 rounded-lg p-3 border border-green-100 space-y-1.5 text-xs">
                                        <div className="text-[10px] font-semibold text-green-800 uppercase tracking-wide mb-1">
                                            {locale === 'ru' ? 'Финансы' : 'Financials'}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">{locale === 'ru' ? 'Продажа' : 'Sale'}:</span>
                                            <span className="font-semibold text-gray-800">{formatPrice(order.total)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">{locale === 'ru' ? 'Комиссия Ozon' : 'Ozon Fee'}:</span>
                                            <span className="font-medium text-red-600">
                                                −{formatPrice(order.commissionAmount)}
                                                {order.commissionPercent > 0 && (
                                                    <span className="text-gray-400 ml-1">({order.commissionPercent.toFixed(1)}%)</span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between pt-1.5 border-t border-green-200">
                                            <span className="font-semibold text-green-800">{locale === 'ru' ? 'К выплате' : 'Payout'}:</span>
                                            <span className="font-bold text-green-700">{formatPrice(order.payout)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handlePrintLabel}
                                        disabled={labelLoading}
                                        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
                                    >
                                        {labelLoading ? (
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Printer size={13} />
                                        )}
                                        {locale === 'ru' ? 'Печать этикетки' : 'Print Label'}
                                    </button>
                                    {labelError && (
                                        <span className="text-[11px] text-red-500">{labelError}</span>
                                    )}
                                    <a
                                        href={`https://seller.ozon.ru/app/postings/fbs?postingNumber=${order.postingNumber}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        <ExternalLink size={12} />
                                        {locale === 'ru' ? 'Открыть в Ozon Seller' : 'Open in Ozon Seller'}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
