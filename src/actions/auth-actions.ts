'use server';

import { AuthRepository } from '@/lib/data';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Simple session auth wrapper over the provider-agnostic data factory
// This normalizes Auth to Next.js cookies, decoupling real-time SDKs from the UI

const AUTH_COOKIE = 'somanatha_session';
const COOKIE_SECRET = process.env.SESSION_SECRET || 'somanatha-default-secret-change-me';

export interface AppUser {
    uid: string;
    email: string | null;
}

/**
 * Create an HMAC signature for the cookie value to prevent tampering.
 */
function signValue(value: string): string {
    const signature = crypto
        .createHmac('sha256', COOKIE_SECRET)
        .update(value)
        .digest('base64url');
    return `${value}.${signature}`;
}

/**
 * Verify and extract the original value from a signed cookie.
 * Returns null if the signature is invalid.
 */
function verifySignedValue(signedValue: string): string | null {
    const lastDot = signedValue.lastIndexOf('.');
    if (lastDot === -1) return null;

    const value = signedValue.substring(0, lastDot);
    const signature = signedValue.substring(lastDot + 1);

    const expectedSignature = crypto
        .createHmac('sha256', COOKIE_SECRET)
        .update(value)
        .digest('base64url');

    // Timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) return null;

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    return value;
}

export async function login(email: string, pass: string) {
    try {
        await AuthRepository.signInWithEmail(email, pass);
        // If the repository didn't throw, credentials are valid!
        // We set a signed secure cookie for Next.js to remember the session
        cookies().set(AUTH_COOKIE, signValue(email), {
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

export async function getSession(): Promise<AppUser | null> {
    const signedValue = cookies().get(AUTH_COOKIE)?.value;
    if (!signedValue) return null;

    const email = verifySignedValue(signedValue);
    if (!email) {
        // Invalid signature — tampered cookie; delete it
        cookies().delete(AUTH_COOKIE);
        return null;
    }

    return { uid: 'admin_user', email };
}
