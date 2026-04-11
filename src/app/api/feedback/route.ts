import { NextResponse } from 'next/server';
import { sendTelegramFeedbackNotification } from '@/lib/telegram';
import { sendEmailFeedbackNotification } from '@/lib/mailer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, phone, telegram } = body;

        // Validation
        if (!message || message.trim().length < 2) {
            return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
        }
        if (!phone || phone.trim().length < 5) {
            return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
        }

        const feedbackData = {
            message: message.trim(),
            phone: phone.trim(),
            telegram: telegram ? telegram.trim() : null,
        };

        // Send notifications in parallel
        await Promise.all([
            sendTelegramFeedbackNotification(feedbackData),
            sendEmailFeedbackNotification(feedbackData),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Feedback error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
