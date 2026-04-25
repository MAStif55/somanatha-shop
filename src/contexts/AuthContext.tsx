'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as loginAction, logout as logoutAction, getSession, AppUser } from '@/actions/auth-actions';



// AppUser moved to auth-actions or keep here.
// Re-export here for backward compatibility
export type { AppUser } from '@/actions/auth-actions';

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: React.ReactNode;
    loginRedirect?: string;
    logoutRedirect?: string;
}

export const AuthProvider = ({
    children,
    loginRedirect = '/admin',
    logoutRedirect = '/admin/login'
}: AuthProviderProps) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        getSession().then(session => {
            if (mounted) {
                setUser(session);
                setLoading(false);
            }
        }).catch(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    const login = async (email: string, pass: string) => {
        const res = await loginAction(email, pass);
        if (res.success) {
            window.location.href = loginRedirect; // Hard navigate to prevent layout caching issues
        } else {
            throw new Error(res.error || 'Login failed');
        }
    };

    const logout = async () => {
        await logoutAction();
        window.location.href = logoutRedirect;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

