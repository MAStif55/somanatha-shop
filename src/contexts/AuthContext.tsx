'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthRepository } from '@/lib/data';
import { useRouter } from 'next/navigation';

export interface AppUser {
    uid: string;
    email: string | null;
}

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
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = AuthRepository.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async (email: string, pass: string) => {
        await AuthRepository.signInWithEmail(email, pass);
        router.push(loginRedirect);
    };

    const logout = async () => {
        await AuthRepository.signOut();
        router.push(logoutRedirect);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

