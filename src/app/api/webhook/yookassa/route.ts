import { NextResponse } from 'next/server';
import { OrderRepository } from '@/lib/data';
import { sendTelegramOrderNotification } from '@/lib/telegram';
import { sendEmailOrderNotification } from '@/lib/mailer';

export async function POST(request: Request) {
    try {
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

            const notificationStatus: any = {};
            if (telegramResult.status === 'rejected') {
                notificationStatus.telegramError = telegramResult.reason?.message || 'Unknown error';
            }
            if (emailResult.status === 'rejected') {
                notificationStatus.emailError = emailResult.reason?.message || 'Unknown error';
            }
            if (Object.keys(notificationStatus).length > 0) {
                await OrderRepository.update(orderId, { notificationStatus });
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
