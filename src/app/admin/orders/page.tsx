'use client';

import { useEffect, useState } from 'react';
import { OrderRepository } from '@/lib/data';
import { Order, OrderStatus } from '@/types/order';
import { useTranslation } from '@/contexts/LanguageContext';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { formatPrice } from '@/utils/currency';
import { Clock, CheckCircle, XCircle, Archive, Search, RefreshCw, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react';
import OrderDetailsModal from '@/components/admin/OrderDetailsModal';
import ConfirmModal from '@/components/admin/ConfirmModal';

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const { t, locale } = useTranslation();

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Race condition timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 8000)
            );
            const dataPromise = OrderRepository.getAll();
            const data = await Promise.race([dataPromise, timeoutPromise]) as Order[];
            setOrders(data);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        try {
            await OrderRepository.update(orderId, { status: newStatus });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert(t('admin.save_error'));
        }
    };

    const handlePermanentDelete = async () => {
        if (!deleteTarget) return;
        try {
            await OrderRepository.delete(deleteTarget);
            setOrders(prev => prev.filter(o => o.id !== deleteTarget));
        } catch (error) {
            console.error("Error deleting order:", error);
            alert(t('admin.delete_failed'));
        } finally {
            setDeleteTarget(null);
        }
    };

    const filteredOrders = orders.filter(order => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (order.customerName || '').toLowerCase().includes(searchLower) ||
            (order.email || '').toLowerCase().includes(searchLower) ||
            order.id.toLowerCase().includes(searchLower)
        );
    });

    const getOrdersByStatus = (statuses: OrderStatus[]) => {
        return filteredOrders.filter(o => statuses.includes(o.status));
    };

    // Columns configuration
    const columns = [
        {
            id: 'new',
            title: t('admin.orders_kanban.new'),
            statuses: ['pending'] as OrderStatus[],
            color: 'bg-yellow-50 border-yellow-200',
            headerColor: 'text-yellow-800'
        },
        {
            id: 'completed',
            title: t('admin.orders_kanban.completed'),
            statuses: ['completed'] as OrderStatus[],
            color: 'bg-green-50 border-green-200',
            headerColor: 'text-green-800'
        },
        {
            id: 'archive',
            title: t('admin.orders_kanban.archive'),
            statuses: ['archived', 'cancelled'] as OrderStatus[],
            color: 'bg-gray-50 border-gray-200',
            headerColor: 'text-gray-800'
        }
    ];

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';

        let date: Date;

        // Handle Firestore Timestamp object
        if (typeof timestamp === 'object' && 'seconds' in timestamp) {
            date = new Date(timestamp.seconds * 1000);
        } else {
            // Handle number timestamp
            date = new Date(timestamp);
        }

        if (isNaN(date.getTime())) return 'Invalid Date';

        return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    const OrderCard = ({ order }: { order: Order }) => (
        <div
            onClick={() => setSelectedOrder(order)}
            className="bg-white p-4 rounded-lg border shadow-sm mb-3 hover:shadow-md transition-shadow cursor-pointer group"
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-gray-500 group-hover:text-primary transition-colors">#{order.id.slice(-8).toUpperCase()}</span>
                <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
            </div>

            <h4 className="font-bold text-gray-900 mb-1">{order.customerName}</h4>
            <div className="text-sm text-gray-600 mb-1">
                {order.items.length} {locale === 'ru' ? 'шт.' : 'items'} • <span className="font-medium text-gray-900">{formatPrice(order.total)}</span>
            </div>

            {/* Payment Status Badge */}
            <div className="mb-3">
                {order.paymentStatus === 'paid' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        💳 {locale === 'ru' ? 'Оплачен' : 'Paid'}
                    </span>
                ) : order.paymentStatus === 'failed' || order.paymentStatus === 'cancelled' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                        ❌ {locale === 'ru' ? 'Не оплачен' : 'Not paid'}
                    </span>
                ) : order.paymentStatus === 'awaiting_transfer' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        🏦 {locale === 'ru' ? 'Ожидает перевода' : 'Awaiting transfer'}
                    </span>
                ) : order.paymentStatus === 'pending' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                        🕐 {locale === 'ru' ? 'Ожидание оплаты' : 'Awaiting payment'}
                    </span>
                ) : null}
            </div>

            {/* Contact Methods */}
            {order.contactPreferences?.methods && order.contactPreferences.methods.length > 0 ? (
                <div className="flex flex-wrap gap-1 mb-3">
                    <span className="text-[10px] text-gray-400 font-medium mr-1">{locale === 'ru' ? 'Связь:' : 'Contact:'}</span>
                    {order.contactPreferences.methods.map((method: string) => {
                        const icons: Record<string, string> = { telegram: '💬', max: '📲', phone_call: '📞', sms: '📱', email: '📧' };
                        const labels: Record<string, string> = { telegram: 'TG', max: 'MAX', phone_call: locale === 'ru' ? 'Звонок' : 'Call', sms: 'SMS', email: 'Email' };
                        return (
                            <span key={method} className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                                {icons[method]} {labels[method]}
                            </span>
                        );
                    })}
                </div>
            ) : order.telegram ? (
                <div className="flex items-center gap-1 text-[10px] text-sky-600 mb-3">
                    💬 {order.telegram}
                </div>
            ) : null}

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t gap-2" onClick={e => e.stopPropagation()}>
                {order.status === 'pending' && (
                    <>
                        <button
                            onClick={() => handleStatusChange(order.id, 'cancelled')}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                            {locale === 'ru' ? 'Отмена' : 'Cancel'}
                        </button>
                        <button
                            onClick={() => handleStatusChange(order.id, 'completed')}
                            className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-md hover:bg-green-200 font-bold ml-auto"
                        >
                            <span>{t('admin.orders_kanban.mark_completed')}</span>
                            <ArrowRight size={12} />
                        </button>
                    </>
                )}

                {order.status === 'completed' && (
                    <>
                        <button
                            onClick={() => handleStatusChange(order.id, 'pending')}
                            className="text-xs text-gray-500 hover:text-gray-700"
                        >
                            <ArrowLeft size={12} />
                        </button>
                        <button
                            onClick={() => handleStatusChange(order.id, 'archived')}
                            className="flex items-center gap-1 text-xs bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200 font-bold ml-auto"
                        >
                            <span>{t('admin.orders_kanban.mark_archived')}</span>
                            <Archive size={12} />
                        </button>
                    </>
                )}

                {(order.status === 'archived' || order.status === 'cancelled') && (
                    <div className="flex items-center justify-between w-full">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {t(`admin.status.${order.status}`)}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setDeleteTarget(order.id)}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                                <Trash2 size={12} />
                                {t('admin.orders_kanban.permanent_delete')}
                            </button>
                            <button
                                onClick={() => handleStatusChange(order.id, 'pending')}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                {t('admin.orders_kanban.restore')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <Breadcrumbs />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 flex-shrink-0">
                <div className="flex items-center gap-4 w-full">
                    <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                        {t('admin.orders')}
                    </h1>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('admin.orders_kanban.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900 placeholder-gray-500"
                        />
                    </div>
                </div>
                <button
                    onClick={fetchOrders}
                    className="p-2 text-gray-800 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {loading ? (
                <div className="flex gap-6 overflow-auto pb-4 flex-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="min-w-[320px] bg-gray-50 rounded-xl p-4 animate-pulse h-full">
                            <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
                            <div className="space-y-3">
                                <div className="h-32 bg-gray-200 rounded-lg"></div>
                                <div className="h-32 bg-gray-200 rounded-lg"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex gap-6 overflow-x-auto pb-4 flex-1 h-full items-start">
                    {columns.map(col => {
                        const colOrders = getOrdersByStatus(col.statuses);
                        return (
                            <div key={col.id} className={`min-w-[320px] w-full max-w-sm flex flex-col h-full rounded-xl border-2 ${col.color} bg-opacity-30`}>
                                <div className="p-4 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
                                    <div className="flex justify-between items-center">
                                        <h3 className={`font-bold text-lg ${col.headerColor}`}>{col.title}</h3>
                                        <span className="bg-white px-2.5 py-0.5 rounded-full text-sm font-bold shadow-sm text-gray-600">
                                            {colOrders.length}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 overflow-y-auto flex-1 custom-scrollbar">
                                    {colOrders.length > 0 ? (
                                        colOrders.map(order => <OrderCard key={order.id} order={order} />)
                                    ) : (
                                        <div className="text-center py-10 text-gray-400 text-sm italic">
                                            {t('admin.no_products')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <OrderDetailsModal
                order={selectedOrder}
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onUpdate={fetchOrders}
            />

            <ConfirmModal
                isOpen={!!deleteTarget}
                title={t('admin.orders_kanban.permanent_delete')}
                message={t('admin.orders_kanban.confirm_permanent_delete')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                onConfirm={handlePermanentDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
