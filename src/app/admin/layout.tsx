'use client';

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
    Sliders
} from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { t, locale } = useTranslation();

    useEffect(() => {
        const normalizedPath = pathname?.endsWith('/') ? pathname.slice(0, -1) : pathname;
        if (!loading && !user && normalizedPath !== '/admin/login') {
            router.push('/admin/login');
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
            <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-gray-800 font-medium">{t('admin.loading')}</div>
                {showForceLogout && (
                    <div className="mt-4 flex flex-col items-center gap-2 animate-in fade-in duration-500">
                        <p className="text-sm text-gray-500">Taking too long?</p>
                        <button
                            onClick={() => window.location.href = '/admin/login'}
                            className="text-red-500 text-sm hover:underline font-medium"
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
            <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-gray-800 font-semibold">Redirecting to login...</div>
                </div>
                <button
                    onClick={() => router.push('/admin/login')}
                    className="text-primary hover:underline text-sm font-medium"
                >
                    Click here if not redirected
                </button>
            </div>
        );
    }

    const navItems = [
        { href: '/admin', label: t('admin.dashboard'), icon: LayoutDashboard },
        { href: '/admin/products', label: t('admin.products'), icon: Package },
        { href: '/admin/subcategories', label: locale === 'ru' ? 'Подкатегории' : 'Subcategories', icon: Sliders },
        { href: '/admin/variations', label: locale === 'ru' ? 'Вариации' : 'Variations', icon: Sliders },
        { href: '/admin/orders', label: t('admin.orders'), icon: ShoppingCart },
        { href: '/admin/customers', label: t('admin.customers') || 'Customers', icon: Users },
        { href: '/admin/reviews', label: locale === 'ru' ? 'Отзывы' : 'Reviews', icon: Users },
        { href: '/admin/settings', label: t('admin.settings') || 'Settings', icon: Settings },
    ];

    return (
        <div className="admin-shell flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="admin-sidebar w-64 flex flex-col shadow-sm">
                <div className="admin-sidebar-header p-5">
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">{t('admin.title')}</h2>
                </div>
                <nav className="px-3 py-4 space-y-1 flex-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                            (item.href !== '/admin' && pathname?.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                            >
                                <Icon size={19} className="admin-nav-icon" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="px-3 py-4 border-t border-gray-100">
                    <button
                        onClick={() => logout()}
                        className="admin-logout-btn"
                    >
                        <LogOut size={19} />
                        <span>{t('admin.logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
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
