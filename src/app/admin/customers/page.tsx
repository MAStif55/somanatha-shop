'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { getCustomers } from '@/lib/customer-service';
import { Customer } from '@/types/customer';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { Search, RefreshCw, User, ShoppingBag, Calendar } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import Link from 'next/link';

export default function AdminCustomersPage() {
    const { t, locale } = useTranslation();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    return (
        <div>
            <Breadcrumbs />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-900">{locale === 'ru' ? 'Клиенты' : 'Customers'}</h1>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={locale === 'ru' ? 'Поиск клиентов...' : 'Search customers...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <button
                        onClick={fetchCustomers}
                        className="p-2 text-gray-800 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-4 rounded-lg shadow-sm animate-pulse h-20"></div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{locale === 'ru' ? 'Клиент' : 'Customer'}</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{locale === 'ru' ? 'Заказы' : 'Orders'}</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{locale === 'ru' ? 'Всего потрачено' : 'Total Spent'}</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{locale === 'ru' ? 'Последний заказ' : 'Last Order'}</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                    {customer.name?.charAt(0).toUpperCase() || <User size={18} />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{customer.name || (locale === 'ru' ? 'Без имени' : 'No Name')}</div>
                                                    <div className="text-sm text-gray-500">{customer.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-gray-700">
                                                <ShoppingBag size={16} className="text-gray-400" />
                                                <span className="font-medium">{customer.orderCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-900">{formatPrice(customer.totalSpent)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} className="text-gray-400" />
                                                {formatDate(customer.lastOrderDate)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/admin/customer-details?id=${encodeURIComponent(customer.id)}`}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                {locale === 'ru' ? 'Подробнее' : 'View Profile'}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredCustomers.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            {locale === 'ru' ? 'Клиенты не найдены' : 'No customers found'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
