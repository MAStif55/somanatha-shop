import { NextResponse } from 'next/server';
import { getDb } from '@/lib/data/yandex/mongo-client';
import { setCustomerSession } from '@/actions/customer-auth-actions';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ success: false, error: 'missing_token' }, { status: 400 });
        }

        const db = await getDb();

        // 1. Find the token document
        const tokenDoc = await db.collection('auth_tokens').findOne({ token });

        if (!tokenDoc) {
            // Token not found or expired (automatically pruned by TTL)
            return NextResponse.json({ success: false, error: 'expired' }, { status: 400 });
        }

        // 2. Immediately delete the token to prevent reuse (single-use link)
        await db.collection('auth_tokens').deleteOne({ token });

        // 3. Check token expiration manually just in case TTL has not fired yet (1 hour limit)
        // Note: createdAt is a Date object since we inserted it using `new Date()`
        const ageInMs = Date.now() - new Date(tokenDoc.createdAt).getTime();
        if (ageInMs > 3600 * 1000) {
            return NextResponse.json({ success: false, error: 'expired' }, { status: 400 });
        }

        // 4. Authorize customer session (sets signed secure cookie)
        await setCustomerSession(tokenDoc.email);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Auth Callback] Verification error:', error);
        return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }
}
