'use client';

import { getAllProducts, getAllOrders } from '@/actions/admin-actions';
import { getCustomers } from '@/lib/customer-service';

import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { Package, ShoppingCart, Users, Settings } from 'lucide-react';
import DeployButton from '@/components/admin/DeployButton';
import BackupButton from '@/components/admin/BackupButton';
import { useEffect, useState } from 'react';

import { Order } from '@/types/order';

export default function AdminDashboard() {
    const { user } = useAuth();
    const { t, locale } = useTranslation();
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [completedCount, setCompletedCount] = useState<number | null>(null);
    const [productCount, setProductCount] = useState<number | null>(null);
    const [customerCount, setCustomerCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [orders, products, customers] = await Promise.all([
                    getAllOrders(),
                    getAllProducts(),
                    getCustomers(),
                ]);
                setPendingCount(orders.filter(o => o.status === 'pending').length);
                setCompletedCount(orders.filter(o => o.status === 'completed').length);
                setProductCount(products.length);
                setCustomerCount(customers.length);
            } catch (error) {
                console.error("Error fetching stats:", error);
                setPendingCount(0);
                setCompletedCount(0);
                setProductCount(0);
                setCustomerCount(0);
            }
        };

        fetchStats();
    }, []);

    const stats = [
        {
            label: locale === 'ru' ? 'Товары' : 'Products',
            value: productCount,
            icon: Package,
            href: '/admin/products',
            color: '#3b82f6',
        },
        {
            label: locale === 'ru' ? 'Заказы' : 'Orders',
            value: null, // custom render
            icon: ShoppingCart,
            href: '/admin/orders',
            color: '#22c55e',
            isOrders: true,
        },
        {
            label: locale === 'ru' ? 'Клиенты' : 'Customers',
            value: customerCount,
            icon: Users,
            href: '/admin/customers',
            color: '#6366f1',
        },
        {
            label: locale === 'ru' ? 'Настройки' : 'Settings',
            value: null,
            icon: Settings,
            href: '/admin/settings',
            color: '#6b7280',
            isLink: true,
        },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="admin-page-title">
                    {locale === 'ru' ? 'Панель управления' : 'Dashboard'}
                </h1>
                <p className="admin-page-subtitle">
                    {locale === 'ru' ? 'Добро пожаловать,' : 'Welcome back,'}{' '}
                    <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{user?.email}</span>
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    const isOrders = 'isOrders' in stat && stat.isOrders;
                    const isLink = 'isLink' in stat && stat.isLink;
                    return (
                        <Link
                            key={index}
                            href={stat.href}
                            className="admin-stat-card"
                            style={{ borderTop: `3px solid ${stat.color}` }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${stat.color}15` }}>
                                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
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
                                ) : isLink ? (
                                    <span className="text-sm text-gray-400">→</span>
                                ) : (
                                    <span className="text-2xl font-bold" style={{ color: 'var(--admin-text)' }}>
                                        {stat.value === null ? '...' : stat.value}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                                {stat.label}
                            </h3>
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="admin-section-card">
                    <h2 className="admin-section-title">
                        {locale === 'ru' ? 'Быстрые действия' : 'Quick Actions'}
                    </h2>
                    <div className="space-y-3">
                        <Link href="/admin/products/new" className="admin-dashed-action">
                            + {locale === 'ru' ? 'Добавить товар' : 'Add New Product'}
                        </Link>
                    </div>
                </div>

                {/* Deploy & Backup */}
                <div className="admin-section-card">
                    <h2 className="admin-section-title">
                        {locale === 'ru' ? 'Обслуживание' : 'Maintenance'}
                    </h2>
                    <div className="space-y-4">
                        <DeployButton />
                        <div className="border-t" style={{ borderColor: 'var(--admin-border-light)' }}></div>
                        <BackupButton />
                    </div>
                </div>
            </div>
        </div>
    );
}
