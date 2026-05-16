'use client';

import './admin.css';
import { useAuth } from "@/contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    LogOut,
    Settings,
    Users,
    Sliders,
    Star,
    Store
} from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

// Nav groups for organized sidebar
const getNavGroups = (t: (key: string) => string, locale: string) => [
    {
        label: locale === 'ru' ? 'Каталог' : 'Catalog',
        items: [
            { href: '/admin/products', label: t('admin.products'), icon: Package },
            { href: '/admin/subcategories', label: locale === 'ru' ? 'Подкатегории' : 'Subcategories', icon: Sliders },
            { href: '/admin/variations', label: locale === 'ru' ? 'Вариации' : 'Variations', icon: Sliders },
        ],
    },
    {
        label: locale === 'ru' ? 'Продажи' : 'Sales',
        items: [
            { href: '/admin/orders', label: t('admin.orders'), icon: ShoppingCart },
            { href: '/admin/ozon-orders', label: locale === 'ru' ? 'Заказы Ozon' : 'Ozon Orders', icon: Store },
            { href: '/admin/customers', label: t('admin.customers') || 'Customers', icon: Users },
        ],
    },
    {
        label: locale === 'ru' ? 'Контент' : 'Content',
        items: [
            { href: '/admin/reviews', label: locale === 'ru' ? 'Отзывы' : 'Reviews', icon: Star },
        ],
    },
    {
        label: locale === 'ru' ? 'Система' : 'System',
        items: [
            { href: '/admin/settings', label: t('admin.settings') || 'Settings', icon: Settings },
        ],
    },
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { t, locale } = useTranslation();

    useEffect(() => {
        const normalizedPath = pathname?.endsWith('/') ? pathname.slice(0, -1) : pathname;
        if (!loading && !user && normalizedPath !== '/admin/login') {
            router.push('/admin/login');
        } else if (!loading && user && normalizedPath === '/admin/login') {
            router.push('/admin');
        }
    }, [user, loading, router, pathname]);

    // Normalize pathname by removing trailing slash for consistent comparison
    const normalizedPath = pathname?.endsWith('/') ? pathname.slice(0, -1) : pathname;

    const [showForceLogout, setShowForceLogout] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (loading) {
            timeout = setTimeout(() => setShowForceLogout(true), 5000);
        }
        return () => clearTimeout(timeout);
    }, [loading]);

    if (loading) {
        return (
            <div className="admin-login-bg flex-col gap-4">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-white/70 font-medium">{t('admin.loading')}</div>
                {showForceLogout && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                        <p className="text-sm text-white/40">Taking too long?</p>
                        <button
                            onClick={() => window.location.href = '/admin/login'}
                            className="text-red-400 text-sm hover:underline font-medium"
                        >
                            Force Refresh / Logout
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (normalizedPath === '/admin/login') {
        return <>{children}</>;
    }

    if (!user) {
        return (
            <div className="admin-login-bg flex-col gap-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-white/70 font-semibold">Redirecting to login...</div>
                </div>
                <button
                    onClick={() => router.push('/admin/login')}
                    className="text-amber-400 hover:underline text-sm font-medium"
                >
                    Click here if not redirected
                </button>
            </div>
        );
    }

    const navGroups = getNavGroups(t, locale);

    return (
        <div className="admin-shell flex min-h-screen">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                {/* Header */}
                <div className="admin-sidebar-header">
                    <Link href="/admin" className="block">
                        <h2>{t('admin.title')}</h2>
                    </Link>
                </div>

                {/* Dashboard link (standalone, above groups) */}
                <div className="px-2 pt-3">
                    <Link
                        href="/admin"
                        className={`admin-nav-item ${pathname === '/admin' ? 'active' : ''}`}
                    >
                        <LayoutDashboard size={18} className="admin-nav-icon" />
                        <span>{t('admin.dashboard')}</span>
                    </Link>
                </div>

                {/* Grouped navigation */}
                <nav className="flex-1 pb-4">
                    {navGroups.map((group) => (
                        <div key={group.label}>
                            <div className="admin-nav-group-label">{group.label}</div>
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href ||
                                    (item.href !== '/admin' && pathname?.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`admin-nav-item ${isActive ? 'active' : ''}`}
                                    >
                                        <Icon size={18} className="admin-nav-icon" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Footer / Logout */}
                <div className="admin-sidebar-footer">
                    <button
                        onClick={() => logout()}
                        className="admin-logout-btn"
                    >
                        <LogOut size={18} />
                        <span>{t('admin.logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <AuthProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AuthProvider>
    );
}
