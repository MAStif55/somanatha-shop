'use client';

import { OrderRepository } from '@/lib/data';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { Package, ShoppingCart, Users, TrendingUp, Settings } from 'lucide-react';
import DeployButton from '@/components/admin/DeployButton';
import BackupButton from '@/components/admin/BackupButton';
import { useEffect, useState } from 'react';

import { Order } from '@/types/order';

export default function AdminDashboard() {
    const { user } = useAuth();
    const { t, locale } = useTranslation();
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [completedCount, setCompletedCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const orders = await OrderRepository.getAll();
                setPendingCount(orders.filter(o => o.status === 'pending').length);
                setCompletedCount(orders.filter(o => o.status === 'completed').length);
            } catch (error) {
                console.error("Error fetching stats:", error);
                setPendingCount(0);
                setCompletedCount(0);
            }
        };

        fetchStats();
    }, []);

    const ordersDisplay = pendingCount === null ? '...' : '';

    const stats = [
        { label: locale === 'ru' ? 'Товары' : 'Products', value: '...', icon: Package, href: '/admin/products', color: 'bg-blue-500' },
        { label: locale === 'ru' ? 'Заказы' : 'Orders', value: ordersDisplay, icon: ShoppingCart, href: '/admin/orders', color: 'bg-green-500', isOrders: true },
        { label: locale === 'ru' ? 'Клиенты' : 'Customers', value: '', icon: Users, href: '/admin/customers', color: 'bg-indigo-500' },
        { label: locale === 'ru' ? 'Настройки' : 'Settings', value: '', icon: Settings, href: '/admin/settings', color: 'bg-gray-500' },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="admin-page-title">
                    {locale === 'ru' ? 'Панель управления' : 'Dashboard'}
                </h1>
                <p className="admin-page-subtitle">
                    {locale === 'ru' ? 'Добро пожаловать,' : 'Welcome back,'} <span className="font-semibold text-gray-800">{user?.email}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    const isOrders = 'isOrders' in stat && stat.isOrders;
                    const accentColor = stat.color.replace('bg-', '');
                    const colorMap: Record<string, string> = {
                        'blue-500': '#3b82f6',
                        'green-500': '#22c55e',
                        'indigo-500': '#6366f1',
                        'gray-500': '#6b7280',
                    };
                    const borderColor = colorMap[accentColor] || '#e5e7eb';
                    return (
                        <Link
                            key={index}
                            href={stat.href}
                            className="admin-stat-card"
                            style={{ borderTop: `3px solid ${borderColor}` }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2.5 rounded-xl ${stat.color} bg-opacity-10`}>
                                    <Icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                                </div>
                                {isOrders && pendingCount !== null ? (
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1.5 text-lg font-bold text-red-600">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                                            {pendingCount}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-lg font-bold text-green-600">
                                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                                            {completedCount}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                                )}
                            </div>
                            <h3 className="text-gray-600 font-semibold text-sm">{stat.label}</h3>
                        </Link>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="admin-section-card">
                    <h2 className="admin-section-title">
                        {locale === 'ru' ? 'Последние действия' : 'Recent Activity'}
                    </h2>
                    <div className="text-center py-8 text-gray-400 font-medium text-sm">
                        {locale === 'ru' ? 'История пуста' : 'No recent activity'}
                    </div>
                </div>

                <div className="admin-section-card">
                    <h2 className="admin-section-title">
                        {locale === 'ru' ? 'Быстрые действия' : 'Quick Actions'}
                    </h2>
                    <div className="space-y-3">
                        <Link href="/admin/products/new" className="block w-full text-center py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-orange-400 hover:text-orange-600 transition-colors text-sm">
                            + {locale === 'ru' ? 'Добавить товар' : 'Add New Product'}
                        </Link>
                        <div className="pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">
                                {locale === 'ru' ? 'Деплой' : 'Deployment'}
                            </p>
                            <DeployButton />
                        </div>
                        <div className="pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">
                                {locale === 'ru' ? 'Данные и резервные копии' : 'Data & Backup'}
                            </p>
                            <BackupButton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

