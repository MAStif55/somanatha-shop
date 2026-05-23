import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { PushRepository } from '@/lib/data';

// Set VAPID keys if present in env (prevent build-time crash when variables aren't loaded)
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
if (publicKey && privateKey) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:info@somanatha.ru',
        publicKey,
        privateKey
    );
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, bodyText, image, url, actions, targetFilter } = body;

        if (!title || !bodyText) {
            return NextResponse.json({ success: false, error: 'Title and Body are required' }, { status: 400 });
        }

        // Construct filter
        let query: any = {};
        if (targetFilter === 'promotions') {
            query = { 'preferences.promotions': true };
        } else if (targetFilter === 'tithi') {
            query = { 'preferences.tithi': true };
        } else if (targetFilter === 'nakshatra') {
            query = { 'preferences.nakshatra': true };
        } else if (targetFilter === 'muhurta') {
            query = { 'preferences.muhurta': true };
        }

        // Load all matching subscriptions
        const subscriptions = await PushRepository.getSubscriptions(query);

        if (subscriptions.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No subscribers matched target filter',
                sentCount: 0,
                successCount: 0,
                failedCount: 0
            });
        }

        const payload = {
            title,
            body: bodyText,
            icon: '/logo.png',
            badge: '/logo.png',
            image: image || null,
            url: url || '/panchanga',
            actions: actions || []
        };

        const payloadString = JSON.stringify(payload);
        const deadEndpoints: string[] = [];
        
        let successCount = 0;
        let failedCount = 0;

        // Send notifications in chunks or parallel
        const promises = subscriptions.map(async (sub) => {
            const pushSub = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.keys.p256dh,
                    auth: sub.keys.auth
                }
            };

            try {
                await webpush.sendNotification(pushSub, payloadString, {
                    headers: {
                        'Urgency': 'high'
                    }
                });
                successCount++;
            } catch (err: any) {
                failedCount++;
                // Check if token has expired or is invalid
                if (err.statusCode === 410 || err.statusCode === 404) {
                    deadEndpoints.push(sub.endpoint);
                } else {
                    console.error(`[WebPush] Failed sending to endpoint ${sub.endpoint}:`, err.message || err);
                }
            }
        });

        // Wait for all push sends to complete
        await Promise.allSettled(promises);

        // Auto-cleanup dead tokens
        if (deadEndpoints.length > 0) {
            console.log(`[WebPush] Cleaning up ${deadEndpoints.length} dead subscription tokens...`);
            await PushRepository.deleteSubscriptions(deadEndpoints);
        }

        // Save campaign report
        const campaignLog = {
            title,
            body: bodyText,
            sentCount: subscriptions.length,
            successCount,
            failedCount,
            targetFilter: targetFilter || 'all'
        };

        await PushRepository.saveCampaign(campaignLog);

        return NextResponse.json({
            success: true,
            sentCount: subscriptions.length,
            successCount,
            failedCount
        });
    } catch (error) {
        console.error('[API Send Push] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
