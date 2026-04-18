'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();
    const { t, locale } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            router.push('/admin');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(locale === 'ru' ? 'Ошибка входа. Проверьте данные.' : 'Login failed. Check credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-bg">
            <div className="admin-login-card">
                <div className="text-center mb-8">
                    <h1>
                        {locale === 'ru' ? 'Вход в Админку' : 'Admin Login'}
                    </h1>
                    <p className="mt-2">Somanatha Shop</p>
                </div>

                {error && (
                    <div className="admin-status-msg error mb-6 w-full justify-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="admin-login-input"
                            placeholder="admin@somanatha.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {locale === 'ru' ? 'Пароль' : 'Password'}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="admin-login-input"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="admin-login-btn"
                    >
                        {loading ? (locale === 'ru' ? 'Вход...' : 'Logging in...') : (locale === 'ru' ? 'Войти' : 'Login')}
                    </button>
                </form>
            </div>
        </div>
    );
}
