import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { PushRepository, PromoRepository } from '@/lib/data';
import { getMomentPanchanga, getDailyPanchanga } from '@/lib/astrology/calculations';
import { randomUUID } from 'crypto';

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

function formatTime(date: Date, timeZone: string) {
    try {
        return date.toLocaleString('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return date.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
    }
}

function formatEndDateTime(endDate: Date, timeZone: string, userLocalDateStr: string) {
    try {
        // Resolve target local time date elements
        const tzString = endDate.toLocaleString('en-US', { timeZone });
        const endLocalDate = new Date(tzString);
        const year = endLocalDate.getFullYear();
        const month = String(endLocalDate.getMonth() + 1).padStart(2, '0');
        const day = String(endLocalDate.getDate()).padStart(2, '0');
        const endLocalDateStr = `${year}-${month}-${day}`;
        
        const timeStr = endDate.toLocaleString('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' });
        
        if (endLocalDateStr === userLocalDateStr) {
            return `${timeStr} (сегодня)`;
        }
        
        // Parse user local date to calculate tomorrow's date
        const [y, m, d] = userLocalDateStr.split('-').map(Number);
        const userDate = new Date(y, m - 1, d);
        userDate.setDate(userDate.getDate() + 1);
        const tomorrowYear = userDate.getFullYear();
        const tomorrowMonth = String(userDate.getMonth() + 1).padStart(2, '0');
        const tomorrowDay = String(userDate.getDate()).padStart(2, '0');
        const tomorrowLocalDateStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
        
        if (endLocalDateStr === tomorrowLocalDateStr) {
            return `${timeStr} (завтра)`;
        }
        
        const dateStr = endDate.toLocaleString('ru-RU', { timeZone, day: 'numeric', month: 'short' });
        return `${timeStr} (${dateStr})`;
    } catch (e) {
        try {
            return endDate.toLocaleString('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' });
        } catch (err) {
            return endDate.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
        }
    }
}

function getMoonImageForTithi(tithiNumber: number): string {
    if (tithiNumber === 30) return '/images/moon/new_moon.png';
    if (tithiNumber >= 1 && tithiNumber <= 5) return '/images/moon/waxing_crescent.png';
    if (tithiNumber >= 6 && tithiNumber <= 10) return '/images/moon/first_quarter.png';
    if (tithiNumber >= 11 && tithiNumber <= 14) return '/images/moon/waxing_gibbous.png';
    if (tithiNumber === 15) return '/images/moon/full_moon.png';
    if (tithiNumber >= 16 && tithiNumber <= 20) return '/images/moon/waning_gibbous.png';
    if (tithiNumber >= 21 && tithiNumber <= 25) return '/images/moon/last_quarter.png';
    if (tithiNumber >= 26 && tithiNumber <= 29) return '/images/moon/waning_crescent.png';
    return '/logo.png';
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

            // 1.5 LUNAR BIRTHDAY FLOW
            if (user.birthTithi !== undefined && (hour === 7 || isForce)) {
                if (user.lastSentLunarBirthdayDate !== localDateStr || isForce) {
                    if (panchanga.tithi.index === user.birthTithi) {
                        
                        // Generate unique one-time promo code valid for 48 hours
                        const uniqueCode = `BDAY-${randomUUID().substring(0, 8).toUpperCase()}`;
                        const now = Date.now();
                        
                        await PromoRepository.createPromo({
                            id: randomUUID(),
                            code: uniqueCode,
                            type: 'percentage',
                            value: 15, // 15% discount
                            isActive: true,
                            maxUses: 1,
                            usesCount: 0,
                            validFrom: now,
                            validUntil: now + 48 * 60 * 60 * 1000, // 48 hours
                            createdAt: now,
                            updatedAt: now
                        });

                        const payload = {
                            title: `🌙 С индивидуальным Лунным Днем Рождения!`,
                            body: `Сегодня ваш персональный лунный день (Титхи). Мы приготовили для вас подарок — автоматическую скидку на ваш заказ!`,
                            icon: getMoonImageForTithi(panchanga.tithi.index + 1),
                            badge: '/logo.png',
                            url: `/?promo=${uniqueCode}`,
                            actions: [
                                { action: 'open_catalog', title: '🎁 Забрать подарок', url: `/?promo=${uniqueCode}` }
                            ]
                        };

                        try {
                            await webpush.sendNotification(pushSub, JSON.stringify(payload), {
                                headers: { 'Urgency': 'high' }
                            });
                            notificationsSent++;
                            
                            if (!isForce) {
                                const db = await (PushRepository as any).getCollection('push_subscriptions');
                                await db.updateOne(
                                    { endpoint: user.endpoint },
                                    { $set: { lastSentLunarBirthdayDate: localDateStr, updatedAt: new Date() } }
                                );
                            }
                        } catch (err: any) {
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                deadEndpoints.push(user.endpoint);
                            }
                        }
                    }
                }
            }

            // 2. DAILY DIGEST FLOW
            if (user.preferences.frequency === 'daily' || isForce) {
                // Send once a day between 7:00 and 8:00 AM local time
                if ((hour === 7 || isForce) && (user.lastSentDailyDate !== localDateStr || isForce)) {
                    const daily = getDailyPanchanga(new Date(), {
                        latitude: user.location.lat,
                        longitude: user.location.lon
                    });

                    let body = `📅 День: ${daily.vara}\n` +
                               `🌙 Луна: ${daily.lunarRashi.fullName}\n` +
                               `🌓 Титхи: ${daily.tithi.name} лунные сутки\n` +
                               `✨ Накшатра: ${daily.nakshatra.name}`;

                    if (daily.brahmaMuhurta) {
                        body += `\n🌅 Брахма-мухурта: ${formatTime(daily.brahmaMuhurta.start, user.timezone)} - ${formatTime(daily.brahmaMuhurta.end, user.timezone)}`;
                    }

                    if (daily.pradosham?.isPradoshamDay) {
                        body += '\n🔱 Благоприятный день Прадошам!';
                    } else if (daily.isBhairavaAshtami) {
                        body += '\n💀 День Калаштами (Бхайрава Аштами).';
                    } else if (daily.tithi.number === 11) {
                        body += '\n🌾 День поста Экадаши.';
                    }

                    const payload = {
                        title: `🗓️ Ведическая сводка дня`,
                        body: body,
                        icon: getMoonImageForTithi(daily.tithi.index + 1),
                        badge: '/logo.png',
                        url: '/panchanga',
                        actions: [
                            { action: 'open_calendar', title: '🗓️ Календарь', url: '/panchanga' },
                            { action: 'open_catalog', title: '🛍️ Каталог', url: '/catalog' }
                        ]
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
                    let body = `🌓 Наступили: ${currentTithi} (${panchanga.tithi.pakshaName})\n` +
                               `⏳ Продлятся до: ${formatEndDateTime(panchanga.tithiBoundaries.end, user.timezone, localDateStr)}`;
                    if (panchanga.isBhairavaAshtami) {
                        body += '\n💀 Особый день Калаштами (Бхайрава Аштами).';
                    }
                    const payload = {
                        title: `🌙 Смена лунных суток (Титхи)${isForceInstant ? ' [Тест]' : ''}`,
                        body: body,
                        icon: getMoonImageForTithi(panchanga.tithi.index + 1),
                        badge: '/logo.png',
                        url: '/panchanga',
                        actions: [
                            { action: 'open_calendar', title: '🗓️ Календарь', url: '/panchanga' },
                            { action: 'open_catalog', title: '🛍️ Каталог', url: '/catalog' }
                        ]
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
                    let body = `✨ Накшатра: ${currentNakshatra} (покровитель: ${panchanga.nakshatra.deity})\n` +
                               `⏳ Продлится до: ${formatEndDateTime(panchanga.nakshatraBoundaries.end, user.timezone, localDateStr)}`;
                    if (panchanga.isArdraNakshatra) {
                        body += '\n🔱 Накшатра управляется Рудрой (Шивой).';
                    }
                    const payload = {
                        title: `✨ Переход в новую Накшатру${isForceInstant ? ' [Тест]' : ''}`,
                        body: body,
                        icon: '/logo.png',
                        badge: '/logo.png',
                        url: '/panchanga',
                        actions: [
                            { action: 'open_calendar', title: '🗓️ Календарь', url: '/panchanga' },
                            { action: 'open_catalog', title: '🛍️ Каталог', url: '/catalog' }
                        ]
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
