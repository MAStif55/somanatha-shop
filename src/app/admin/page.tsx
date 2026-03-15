'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { Package, ShoppingCart, Users, TrendingUp, Settings } from 'lucide-react';
import DeployButton from '@/components/admin/DeployButton';
import { useEffect, useState } from 'react';
import { getAllOrders } from '@/lib/firestore-utils';
import { Order } from '@/types/order';

export default function AdminDashboard() {
    const { user } = useAuth();
    const { t, locale } = useTranslation();
    const [ordersCount, setOrdersCount] = useState<string>('...');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const orders = await getAllOrders<Order>();
                setOrdersCount(orders.length.toString());
            } catch (error) {
                console.error("Error fetching stats:", error);
                setOrdersCount('0');
            }
        };

        fetchStats();
    }, []);

    const stats = [
        { label: locale === 'ru' ? 'Товары' : 'Products', value: '...', icon: Package, href: '/admin/products', color: 'bg-blue-500' },
        { label: locale === 'ru' ? 'Заказы' : 'Orders', value: ordersCount, icon: ShoppingCart, href: '/admin/orders', color: 'bg-green-500' },
        { label: locale === 'ru' ? 'Клиенты' : 'Customers', value: '', icon: Users, href: '/admin/customers', color: 'bg-indigo-500' },
        { label: locale === 'ru' ? 'Настройки' : 'Settings', value: '', icon: Settings, href: '/admin/settings', color: 'bg-gray-500' },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    {locale === 'ru' ? 'Панель управления' : 'Dashboard'}
                </h1>
                <p className="text-gray-500 mt-2">
                    {locale === 'ru' ? 'Добро пожаловать,' : 'Welcome back,'} <span className="font-semibold">{user?.email}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Link key={index} href={stat.href} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                                    <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                                </div>
                                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                            </div>
                            <h3 className="text-gray-600 font-semibold">{stat.label}</h3>
                        </Link>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        {locale === 'ru' ? 'Последние действия' : 'Recent Activity'}
                    </h2>
                    <div className="text-center py-8 text-gray-500 font-medium">
                        {locale === 'ru' ? 'История пуста' : 'No recent activity'}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        {locale === 'ru' ? 'Быстрые действия' : 'Quick Actions'}
                    </h2>
                    <div className="space-y-3">
                        <Link href="/admin/products/new" className="block w-full text-center py-3 border-2 border-dashed border-gray-400 rounded-lg text-gray-600 font-medium hover:border-primary hover:text-primary transition-colors">
                            + {locale === 'ru' ? 'Добавить товар' : 'Add New Product'}
                        </Link>
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
                                {locale === 'ru' ? 'Деплой' : 'Deployment'}
                            </p>
                            <DeployButton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

