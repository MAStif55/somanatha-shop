import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { PushRepository } from '@/lib/data';
import { getMomentPanchanga, getDailyPanchanga } from '@/lib/astrology/calculations';

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

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Authenticate cron caller using auth header if configured (optional, e.g. Vercel Cron Secret)
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const isForce = searchParams.get('force') === 'true';
        const isForceInstant = searchParams.get('forceInstant') === 'true';

        const subscriptions = await PushRepository.getSubscriptions();
        const deadEndpoints: string[] = [];
        let notificationsSent = 0;

        const promises = subscriptions.map(async (user: any) => {
            const pushSub = {
                endpoint: user.endpoint,
                keys: {
                    p256dh: user.keys.p256dh,
                    auth: user.keys.auth
                }
            };

            // 1. Determine local time in user's timezone
            let localTime: Date;
            try {
                const tzString = new Date().toLocaleString('en-US', { timeZone: user.timezone });
                localTime = new Date(tzString);
            } catch (e) {
                // Fallback to Moscow timezone
                const tzString = new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' });
                localTime = new Date(tzString);
            }

            const hour = localTime.getHours();
            const year = localTime.getFullYear();
            const month = String(localTime.getMonth() + 1).padStart(2, '0');
            const day = String(localTime.getDate()).padStart(2, '0');
            const localDateStr = `${year}-${month}-${day}`;

            // Check quiet hours
            const isInQuietHours = !isForceInstant && user.preferences.quietHours && (hour >= 22 || hour < 8);

            // Calculate current moment astrology
            const panchanga = getMomentPanchanga(new Date(), {
                latitude: user.location.lat,
                longitude: user.location.lon
            });

            const currentTithi = panchanga.tithi.name;
            const currentNakshatra = panchanga.nakshatra.name;

            // 2. DAILY DIGEST FLOW
            if (user.preferences.frequency === 'daily') {
                // Send once a day between 7:00 and 8:00 AM local time
                if ((hour === 7 || isForce) && (user.lastSentDailyDate !== localDateStr || isForce)) {
                    const daily = getDailyPanchanga(new Date(), {
                        latitude: user.location.lat,
                        longitude: user.location.lon
                    });

                    let description = `Сегодня ${daily.vara}. Титхи: ${daily.tithi.name} лунные сутки.`;
                    if (daily.pradosham?.isPradoshamDay) {
                        description += ' Благоприятный день Прадошам!';
                    } else if (daily.isBhairavaAshtami) {
                        description += ' Сегодня день Калаштами (Бхайрава Аштами).';
                    } else if (daily.tithi.number === 11) {
                        description += ' Сегодня день поста Экадаши.';
                    }

                    const payload = {
                        title: `🗓️ Ведическая сводка дня`,
                        body: `${description} Накшатра: ${daily.nakshatra.name}.`,
                        icon: '/logo.png',
                        badge: '/logo.png',
                        url: '/panchanga'
                    };

                    try {
                        await webpush.sendNotification(pushSub, JSON.stringify(payload), {
                            headers: {
                                'Urgency': 'high'
                            }
                        });
                        notificationsSent++;
                        
                        // Update cache to prevent duplicate daily pushes and align state
                        if (!isForce) {
                            const db = await (PushRepository as any).getCollection('push_subscriptions');
                            await db.updateOne(
                                { endpoint: user.endpoint },
                                {
                                    $set: {
                                        lastSentDailyDate: localDateStr,
                                        lastSentTithi: currentTithi,
                                        lastSentNakshatra: currentNakshatra,
                                        updatedAt: new Date()
                                    }
                                }
                            );
                        }
                    } catch (err: any) {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            deadEndpoints.push(user.endpoint);
                        }
                    }
                }
                return; // End daily flow
            }

            // 3. INSTANT EVENTS FLOW
            if (user.preferences.frequency === 'instant' && (!isInQuietHours || isForceInstant)) {
                let didTrigger = false;
                const updatePayload: any = {};

                // Tithi Change
                if ((user.preferences.tithi && currentTithi !== user.lastSentTithi) || isForceInstant) {
                    const payload = {
                        title: `🌙 Смена лунных суток (Титхи)${isForceInstant ? ' [Тест]' : ''}`,
                        body: `Наступили ${currentTithi} (${panchanga.tithi.pakshaName}) для г. ${user.location.cityName}.`,
                        icon: '/logo.png',
                        badge: '/logo.png',
                        url: '/panchanga'
                    };

                    try {
                        await webpush.sendNotification(pushSub, JSON.stringify(payload), {
                            headers: {
                                'Urgency': 'high'
                            }
                        });
                        notificationsSent++;
                    } catch (err: any) {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            deadEndpoints.push(user.endpoint);
                        }
                    }
                    if (!isForceInstant) {
                        updatePayload.lastSentTithi = currentTithi;
                        didTrigger = true;
                    }
                }

                // Nakshatra Change
                if ((user.preferences.nakshatra && currentNakshatra !== user.lastSentNakshatra) || isForceInstant) {
                    const payload = {
                        title: `✨ Переход в новую Накшатру${isForceInstant ? ' [Тест]' : ''}`,
                        body: `Луна вошла в созвездие ${currentNakshatra} (покровитель: ${panchanga.nakshatra.deity}).`,
                        icon: '/logo.png',
                        badge: '/logo.png',
                        url: '/panchanga'
                    };

                    try {
                        if (!deadEndpoints.includes(user.endpoint)) {
                            await webpush.sendNotification(pushSub, JSON.stringify(payload), {
                                headers: {
                                    'Urgency': 'high'
                                }
                            });
                            notificationsSent++;
                        }
                    } catch (err: any) {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            deadEndpoints.push(user.endpoint);
                        }
                    }
                    if (!isForceInstant) {
                        updatePayload.lastSentNakshatra = currentNakshatra;
                        didTrigger = true;
                    }
                }

                if (didTrigger && !isForceInstant) {
                    const db = await (PushRepository as any).getCollection('push_subscriptions');
                    await db.updateOne(
                        { endpoint: user.endpoint },
                        {
                            $set: {
                                ...updatePayload,
                                updatedAt: new Date()
                            }
                        }
                    );
                }
            }
        });

        // Resolve all subscriptions concurrently
        await Promise.allSettled(promises);

        // Delete dead endpoints
        if (deadEndpoints.length > 0) {
            console.log(`[Cron] Cleaning up ${deadEndpoints.length} dead tokens...`);
            await PushRepository.deleteSubscriptions(deadEndpoints);
        }

        return NextResponse.json({
            success: true,
            notificationsSent,
            deadTokensRemoved: deadEndpoints.length
        });
    } catch (error) {
        console.error('[API Cron Push] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
