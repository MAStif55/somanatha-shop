import { NextResponse } from 'next/server';
import { PushRepository } from '@/lib/data';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { subscription, preferences, timezone, location, platform } = body;

        // Validation
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return NextResponse.json({ success: false, error: 'Subscription data is required' }, { status: 400 });
        }
        if (!preferences) {
            return NextResponse.json({ success: false, error: 'Preferences are required' }, { status: 400 });
        }

        const data = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
            platform: (platform === 'ios' || platform === 'android' ? platform : 'desktop') as 'ios' | 'android' | 'desktop',
            preferences: {
                tithi: !!preferences.tithi,
                nakshatra: !!preferences.nakshatra,
                muhurta: !!preferences.muhurta,
                promotions: preferences.promotions !== false, // default true
                frequency: (preferences.frequency === 'daily' ? 'daily' : 'instant') as 'instant' | 'daily',
                quietHours: preferences.quietHours !== false, // default true
            },
            timezone: timezone || 'Europe/Moscow',
            location: {
                lat: typeof location?.lat === 'number' ? location.lat : 55.7558,
                lon: typeof location?.lon === 'number' ? location.lon : 37.6173,
                cityName: location?.cityName || 'Москва',
            }
        };

        await PushRepository.saveSubscription(data);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API Subscribe] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json({ success: false, error: 'Endpoint is required' }, { status: 400 });
        }

        await PushRepository.deleteSubscription(endpoint);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API Unsubscribe] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

