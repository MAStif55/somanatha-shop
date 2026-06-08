import { NextResponse } from 'next/server';
import { getDb } from '@/lib/data/yandex/mongo-client';
import { sendMagicLinkEmail } from '@/lib/mailer';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || !email.includes('@')) {
            return NextResponse.json({ success: false, error: 'Введите корректный email' }, { status: 400 });
        }

        const db = await getDb();

        // 1. Verify that this email has at least one order in the system
        const hasOrder = await db.collection('orders').findOne({
            email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
        });

        if (!hasOrder) {
            return NextResponse.json({
                success: false,
                error: 'Почта не найдена в базе заказов. Оформите заказ сначала.'
            }, { status: 404 });
        }

        // 2. Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');

        // 3. Save to auth_tokens collection
        await db.collection('auth_tokens').insertOne({
            email: email.trim().toLowerCase(),
            token,
            createdAt: new Date(), // Using Date object to work correctly with TTL index expireAfterSeconds
        });

        // 4. Construct Magic Link
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const magicLink = `${protocol}://${host}/cabinet/verify?token=${token}`;

        // 5. Send Magic Link Email
        await sendMagicLinkEmail(email.trim().toLowerCase(), magicLink);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API MagicLink] Error:', error);
        return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}
