import { NextResponse } from 'next/server';
import { PushRepository } from '@/lib/data';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json({ success: false, error: 'Endpoint is required' }, { status: 400 });
        }

        const sub = await PushRepository.getSubscription(endpoint);
        if (!sub) {
            return NextResponse.json({ success: true, exists: false });
        }

        return NextResponse.json({
            success: true,
            exists: true,
            preferences: sub.preferences,
            location: sub.location,
            timezone: sub.timezone
        });
    } catch (error) {
        console.error('[API Sync] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
