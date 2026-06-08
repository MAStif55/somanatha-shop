'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/utils/currency';
import OrderChat from '@/components/cabinet/OrderChat';
import { Order } from '@/types/order';

interface CabinetDashboardProps {
    orders: Order[];
}

function getStatusDetails(status: string, paymentStatus?: string, locale: string = 'ru') {
    const isPaid = paymentStatus === 'paid';
    
    if (isPaid && status === 'pending') {
        return {
            label: locale === 'ru' ? 'Оплачен, в очереди на работу' : 'Paid, queued for work',
            className: 'bg-green-500/10 text-green-400 border border-green-500/30'
        };
    }

    if (paymentStatus === 'awaiting_transfer') {
        return {
            label: locale === 'ru' ? 'Ожидает оплаты' : 'Awaiting Payment',
            className: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
        };
    }

    switch (status) {
        case 'pending':
            return {
                label: locale === 'ru' ? 'На проверке мастером' : 'Under Master Review',
                className: 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
            };
        case 'completed':
            return {
                label: locale === 'ru' ? 'Выполнен' : 'Completed',
                className: 'bg-green-500/10 text-green-400 border border-green-500/30'
            };
        case 'cancelled':
            return {
                label: locale === 'ru' ? 'Отменен' : 'Cancelled',
                className: 'bg-red-500/10 text-red-400 border border-red-500/30'
            };
        case 'archived':
            return {
                label: locale === 'ru' ? 'В архиве' : 'Archived',
                className: 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
            };
        default:
            return {
                label: status,
                className: 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
            };
    }
}

export default function CabinetDashboard({ orders }: CabinetDashboardProps) {
    const { locale } = useLanguage();
    // Default to the most recent order if it exists
    const [activeOrderId, setActiveOrderId] = useState<string | null>(
        orders.length > 0 ? orders[0].id : null
    );

    // Update if orders change
    useEffect(() => {
        if (orders.length > 0 && !activeOrderId) {
            setActiveOrderId(orders[0].id);
        }
    }, [orders, activeOrderId]);

    if (orders.length === 0) {
        return (
            <div className="bg-[#1A1517]/80 border border-[#C9A227]/20 rounded-2xl p-12 text-center text-[#F5ECD7]/60 space-y-4 shadow-[0_0_30px_rgba(201,162,39,0.05)] backdrop-blur-sm">
                <span className="text-5xl">📦</span>
                <p className="text-lg">У вас пока нет оформленных заказов.</p>
                <Link
                    href="/#catalog"
                    className="inline-block bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] px-6 py-2.5 rounded-lg font-bold hover:shadow-[0_0_20px_rgba(201,162,39,0.4)] transition-all text-sm uppercase tracking-wider transform hover:-translate-y-0.5"
                >
                    Перейти в каталог
                </Link>
            </div>
        );
    }

    const activeOrder = orders.find(o => o.id === activeOrderId) || orders[0];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Order List & Active Details (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
                <h2 className="text-xl font-bold text-[#E8D48B] mb-2 hidden lg:block">
                    Ваши Заказы
                </h2>
                
                <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#C9A227]/30 scrollbar-track-transparent">
                    {orders.map((order) => {
                        const isExpanded = order.id === activeOrderId;
                        const displayId = order.id.slice(-8).toUpperCase();
                        const statusDetails = getStatusDetails(order.status, order.paymentStatus, locale);
                        
                        const isAwaitingPayment = order.paymentStatus === 'awaiting_transfer' || (order.status === 'pending' && order.paymentUrl);
                        const isPaid = order.paymentStatus === 'paid';
                        
                        // Mock payment URL if missing, similar to order page
                        const mockPaymentUrl = `/payment-mock?orderId=${order.id}&amount=${order.total}`;
                        const paymentUrl = order.paymentUrl || mockPaymentUrl;

                        return (
                            <div 
                                key={order.id} 
                                onClick={() => setActiveOrderId(order.id)}
                                className={`bg-[#1A1517]/80 border rounded-2xl transition-all duration-300 backdrop-blur-sm overflow-hidden cursor-pointer ${
                                    isExpanded 
                                        ? 'border-[#C9A227] shadow-[0_0_20px_rgba(201,162,39,0.15)] ring-1 ring-[#C9A227]/50' 
                                        : 'border-[#C9A227]/20 hover:border-[#C9A227]/50 hover:shadow-sm'
                                }`}
                            >
                                {/* Order Header (Always visible) */}
                                <div className="p-5 flex flex-col justify-between items-start gap-3">
                                    <div className="flex w-full justify-between items-start">
                                        <div className="space-y-1">
                                            <span className="text-lg font-mono font-bold text-[#E8D48B] tracking-wider">
                                                Заказ #{displayId}
                                            </span>
                                            <div className="text-xs text-[#F5ECD7]/60">
                                                {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-sm font-bold text-[#C9A227] font-mono">
                                                {formatPrice(order.total)}
                                            </span>
                                            {order.hasUnreadChat && !isExpanded && (
                                                <span className="inline-block mt-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${statusDetails.className} mt-1 inline-block`}>
                                        {statusDetails.label}
                                    </span>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t border-[#C9A227]/20 bg-[#0D0A0B]/30 animate-fadeIn">
                                        
                                        {/* Payment Action */}
                                        {isAwaitingPayment && !isPaid && (
                                            <div className="p-5 border-b border-[#C9A227]/10 bg-gradient-to-br from-[#1A1517] to-[#0D0A0B]">
                                                <Link
                                                    href={paymentUrl}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-[#0D0A0B] font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all transform hover:-translate-y-0.5 text-sm"
                                                >
                                                    <span>💳</span>
                                                    Оплатить заказ
                                                </Link>
                                            </div>
                                        )}

                                        {/* Items List */}
                                        <div className="p-5 space-y-3">
                                            <h4 className="text-sm font-bold text-[#F5ECD7]/80">Состав заказа:</h4>
                                            <div className="space-y-3 divide-y divide-[#C9A227]/10">
                                                {order.items?.map((item, idx) => (
                                                    <div key={item.productId + idx} className="pt-3 first:pt-0 flex justify-between items-start gap-4">
                                                        <div className="space-y-0.5 flex-1">
                                                            <p className="font-bold text-[#F5ECD7] text-xs leading-tight">{item.productTitle}</p>
                                                            <p className="text-[11px] text-[#F5ECD7]/60">x{item.quantity}</p>
                                                            {item.configuration && Object.keys(item.configuration).length > 0 && (
                                                                <div className="text-[10px] text-[#C9A227]/70 space-y-0.5 mt-1">
                                                                    {Object.entries(item.configuration).map(([key, val]) => (
                                                                        <p key={key}>{key}: {val as React.ReactNode}</p>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-semibold text-[#C9A227] font-mono whitespace-nowrap">
                                                            {formatPrice(item.price * item.quantity)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Attachments */}
                                        {order.attachments && order.attachments.length > 0 && (
                                            <div className="p-5 border-t border-[#C9A227]/10 space-y-3 bg-[#0D0A0B]/20">
                                                <h4 className="text-sm font-bold text-[#F5ECD7]/80">Прикрепленные макеты:</h4>
                                                <div className="space-y-2">
                                                    {order.attachments.map((url, idx) => {
                                                        const originalName = decodeURIComponent(url.substring(url.lastIndexOf('/') + 1)).replace(/^[a-f0-9-]{36}-/, '');
                                                        return (
                                                            <div key={idx} className="flex items-center justify-between p-2 bg-[#1A1517] border border-[#C9A227]/10 rounded-lg">
                                                                <span className="text-[11px] text-[#F5ECD7]/60 truncate max-w-[150px]">
                                                                    {originalName}
                                                                </span>
                                                                <a
                                                                    href={url}
                                                                    download
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="px-2 py-1 bg-[#C9A227]/10 text-[#C9A227] hover:bg-[#C9A227]/20 rounded text-[10px] font-bold"
                                                                >
                                                                    Скачать
                                                                </a>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right Column: Chat Widget (7 cols) */}
            <div className="lg:col-span-7 h-[600px] lg:h-[85vh] lg:sticky lg:top-24 mt-8 lg:mt-0">
                <div className="bg-[#1A1517] border border-[#C9A227]/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(201,162,39,0.05)] h-full flex flex-col relative group hover:border-[#C9A227]/40 transition-colors">
                    {/* Chat Header showing which order is active */}
                    <div className="px-6 py-4 border-b border-[#C9A227]/20 bg-[#0D0A0B]/80 flex justify-between items-center z-10 relative">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></span>
                            <span className="text-sm font-bold text-[#E8D48B] tracking-wider uppercase">
                                Обсуждение макета (#{activeOrder?.id.slice(-8).toUpperCase()})
                            </span>
                        </div>
                        <span className="text-xs text-[#F5ECD7]/40">Мастер онлайн</span>
                    </div>

                    <div className="flex-1 relative overflow-hidden bg-chat-pattern">
                        {/* The Chat Component key forces remount when switching orders so it connects to the new order's SSE */}
                        <OrderChat key={activeOrder?.id} orderId={activeOrder?.id || ''} userType="client" />
                    </div>
                </div>
            </div>
        </div>
    );
}
