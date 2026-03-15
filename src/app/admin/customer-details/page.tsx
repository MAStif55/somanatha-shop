'use client';

import { useEffect, useState, Suspense } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { getCustomers, getCustomerOrders } from '@/lib/customer-service';
import { Customer } from '@/types/customer';
import { Order } from '@/types/order';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { User, Mail, Phone, ShoppingBag, Calendar, DollarSign, ArrowLeft } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import OrderDetailsModal from '@/components/admin/OrderDetailsModal';

function CustomerDetailsContent() {
    const { t, locale } = useTranslation();
    const searchParams = useSearchParams();
    const customerId = searchParams.get('id');

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const fetchData = async () => {
        if (!customerId) return;
        setLoading(true);
        try {
            const allCustomers = await getCustomers();
            const found = allCustomers.find(c => c.id === customerId);

            if (found) {
                setCustomer(found);
                const customerOrders = await getCustomerOrders(found.id);
                setOrders(customerOrders);
            }
        } catch (error) {
            console.error("Error fetching customer details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [customerId]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    if (loading) return <div className="p-8">Loading profile...</div>;
    if (!customer) return <div className="p-8">Customer not found</div>;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <Link href="/admin/customers" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft size={16} className="mr-1" />
                    {locale === 'ru' ? 'Назад к списку' : 'Back to List'}
                </Link>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold">
                            {customer.name?.charAt(0).toUpperCase() || <User />}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
                            <div className="flex items-center gap-4 text-gray-500 mt-1">
                                <span className="flex items-center gap-1.5 text-sm">
                                    <Mail size={14} /> {customer.email}
                                </span>
                                {customer.phone && (
                                    <span className="flex items-center gap-1.5 text-sm">
                                        <Phone size={14} /> {customer.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 text-gray-500 mb-2">
                        <ShoppingBag size={20} />
                        <span className="text-sm font-medium">{locale === 'ru' ? 'Всего заказов' : 'Total Orders'}</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{customer.orderCount}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 text-gray-500 mb-2">
                        <DollarSign size={20} />
                        <span className="text-sm font-medium">{locale === 'ru' ? 'Всего потрачено' : 'Total Spent'}</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600">{formatPrice(customer.totalSpent)}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 text-gray-500 mb-2">
                        <Calendar size={20} />
                        <span className="text-sm font-medium">{locale === 'ru' ? 'Первый заказ' : 'First Order'}</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{formatDate(customer.firstOrderDate)}</div>
                </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-4">{locale === 'ru' ? 'История заказов' : 'Order History'}</h2>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Order ID</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{locale === 'ru' ? 'Дата' : 'Date'}</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{locale === 'ru' ? 'Статус' : 'Status'}</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{locale === 'ru' ? 'Сумма' : 'Total'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {orders.map((order) => (
                            <tr
                                key={order.id}
                                className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                onClick={() => setSelectedOrder(order)}
                            >
                                <td className="px-6 py-4 font-mono text-sm text-blue-600 group-hover:text-blue-800 font-medium">
                                    #{order.id.slice(0, 8)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {formatDate(order.createdAt)}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                                        ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">
                                    {formatPrice(order.total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <OrderDetailsModal
                order={selectedOrder}
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onUpdate={fetchData}
            />
        </div>
    );
}

export default function CustomerDetailsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CustomerDetailsContent />
        </Suspense>
    );
}
