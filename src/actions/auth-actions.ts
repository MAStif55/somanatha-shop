'use strict';
'use server';

import { AuthRepository } from '@/lib/data';
import { cookies } from 'next/headers';

// Simple session auth wrapper over the provider-agnostic data factory
// This normalizes Auth to Next.js cookies, decoupling real-time SDKs from the UI

const AUTH_COOKIE = 'somanatha_session';

export interface AppUser {
    uid: string;
    email: string | null;
}

export async function login(email: string, pass: string) {
    try {
        await AuthRepository.signInWithEmail(email, pass);
        // If the repository didn't throw, credentials are valid!
        // We set a secure cookie for Next.js to remember the session
        cookies().set(AUTH_COOKIE, email, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function logout() {
    await AuthRepository.signOut();
    cookies().delete(AUTH_COOKIE);
    return { success: true };
}

export async function getSession() {
    const sessionEmail = cookies().get(AUTH_COOKIE)?.value;
    if (sessionEmail) {
        return { uid: 'admin_user', email: sessionEmail };
    }
    return null;
}
