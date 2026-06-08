'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { OrderRepository } from '@/lib/data';

const CUSTOMER_AUTH_COOKIE = 'somanatha-customer-session';
const COOKIE_SECRET = process.env.SESSION_SECRET || 'somanatha-default-secret-change-me';

export interface CustomerSession {
    email: string;
}

function signValue(value: string): string {
    const signature = crypto
        .createHmac('sha256', COOKIE_SECRET)
        .update(value)
        .digest('base64url');
    return `${value}.${signature}`;
}

function verifySignedValue(signedValue: string): string | null {
    const lastDot = signedValue.lastIndexOf('.');
    if (lastDot === -1) return null;

    const value = signedValue.substring(0, lastDot);
    const signature = signedValue.substring(lastDot + 1);

    const expectedSignature = crypto
        .createHmac('sha256', COOKIE_SECRET)
        .update(value)
        .digest('base64url');

    if (signature.length !== expectedSignature.length) return null;

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    return value;
}

export async function setCustomerSession(email: string) {
    const cookieStore = await cookies();
    cookieStore.set(CUSTOMER_AUTH_COOKIE, signValue(email), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });
}

export async function customerLogout() {
    const cookieStore = await cookies();
    cookieStore.delete(CUSTOMER_AUTH_COOKIE);
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
    const cookieStore = await cookies();
    const signedValue = cookieStore.get(CUSTOMER_AUTH_COOKIE)?.value;
    if (!signedValue) return null;

    const email = verifySignedValue(signedValue);
    if (!email) {
        cookieStore.delete(CUSTOMER_AUTH_COOKIE);
        return null;
    }

    return { email };
}

export async function getOrderByIdForCustomer(id: string) {
    const session = await getCustomerSession();
    const order = await OrderRepository.getById(id);
    if (!order) return null;
    
    // Privacy protection: if the session owner doesn't match the order owner,
    // return only the status fields (needed for checkout redirect and status checks).
    if (!session || order.email.toLowerCase() !== session.email.toLowerCase()) {
        return {
            id: order.id,
            status: order.status,
            paymentStatus: order.paymentStatus,
        } as any;
    }
    
    return order;
}
