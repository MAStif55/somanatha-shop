'use client';

import { customerLogout } from '@/actions/customer-auth-actions';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LogoutButton() {
    const { locale } = useLanguage();

    const handleLogout = async () => {
        await customerLogout();
        window.location.reload();
    };

    return (
        <button
            onClick={handleLogout}
            className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-semibold transition-all hover:text-red-300"
        >
            {locale === 'ru' ? 'Выйти' : 'Logout'}
        </button>
    );
}
