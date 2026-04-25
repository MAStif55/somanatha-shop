import { NextResponse } from 'next/server';
import { OrderRepository } from '@/lib/data';
import { sendTelegramOrderNotification } from '@/lib/telegram';
import { sendEmailOrderNotification } from '@/lib/mailer';

// ============================================================================
// YOOKASSA WEBHOOK IP WHITELIST
// Official YooKassa IP ranges for webhook notifications.
// See: https://yookassa.ru/developers/using-api/webhooks#ip
// ============================================================================

const YOOKASSA_IP_RANGES = [
    '185.71.76.',   // 185.71.76.0/27
    '185.71.77.',   // 185.71.77.0/27
    '77.75.153.',   // 77.75.153.0/25
    '77.75.156.',   // 77.75.156.0/24
    '77.75.154.',   // 77.75.154.0/25
    '77.75.155.',   // 77.75.155.0/25
    '2a02:5180:',   // IPv6 range
];

function isYooKassaIP(ip: string | null): boolean {
    if (!ip) return false;

    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') return true;

    // Clean up the IP (handle ::ffff: prefix for IPv4-mapped IPv6)
    const cleanIP = ip.replace('::ffff:', '');

    return YOOKASSA_IP_RANGES.some(range => cleanIP.startsWith(range));
}

function getClientIP(request: Request): string | null {
    // Check common headers in order of priority
    const headers = new Headers(request.headers);
    return headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headers.get('x-real-ip')
        || headers.get('cf-connecting-ip')
        || null;
}

export async function POST(request: Request) {
    try {
        // Verify the request comes from YooKassa's IP range
        const clientIP = getClientIP(request);
        if (!isYooKassaIP(clientIP)) {
            console.error(`Webhook rejected: untrusted IP ${clientIP}`);
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();

        if (!body || !body.event || !body.object) {
            console.error('Invalid webhook payload:', body);
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const payment = body.object;
        const paymentId = payment.id;
        const orderId = payment.metadata?.order_id;

        console.log(`Webhook received: ${body.event} for payment ${paymentId}, order ${orderId}`);

        if (!orderId) {
            console.error('No order_id in payment metadata');
            return NextResponse.json({ status: 'ok' });
        }

        const orderData = await OrderRepository.getById(orderId);

        if (!orderData) {
            console.error(`Order ${orderId} not found in DB`);
            // we return 200 ok to yookassa so they stop pinging us
            return NextResponse.json({ status: 'ok' });
        }

        if (body.event === 'payment.succeeded') {
            await OrderRepository.update(orderId, {
                paymentStatus: 'paid',
                paymentId: paymentId,
                paidAt: Date.now(),
            });

            // Send notifications after card payment confirmed
            const [telegramResult, emailResult] = await Promise.allSettled([
                sendTelegramOrderNotification(orderData, orderId, true),
                sendEmailOrderNotification(orderData, orderId, true),
            ]);

            const notificationStatus: Record<string, string> = {};
            if (telegramResult.status === 'rejected') {
                notificationStatus.telegramError = telegramResult.reason?.message || 'Unknown error';
            }
            if (emailResult.status === 'rejected') {
                notificationStatus.emailError = emailResult.reason?.message || 'Unknown error';
            }
            if (Object.keys(notificationStatus).length > 0) {
                await OrderRepository.update(orderId, { notificationStatus } as any);
            }

            console.log(`Order ${orderId} payment confirmed, notifications sent`);
        } else if (body.event === 'payment.canceled') {
            await OrderRepository.update(orderId, {
                paymentStatus: 'cancelled',
                paymentId: paymentId,
            });
            console.log(`Order ${orderId} payment cancelled`);
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ status: 'ok' });
    }
}
