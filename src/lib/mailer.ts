import nodemailer from 'nodemailer';

let _transporter: nodemailer.Transporter | null = null;

export function getTransporter() {
    if (!_transporter) {
        const smtpHost = process.env.SMTP_HOST;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        if (!smtpHost || !smtpUser || !smtpPass) return null;
        
        _transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 465,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: { user: smtpUser, pass: smtpPass },
        });
    }
    return _transporter;
}

const CONTACT_METHOD_LABELS: Record<string, string> = {
    telegram: '💬 Telegram',
    max: '📲 MAX',
    phone_call: '📞 Звонок',
    sms: '📱 SMS',
    email: '📧 Email',
};

function formatContactPreferencesHtml(orderData: any): string {
    const cp = orderData.contactPreferences;
    if (!cp || !cp.methods || cp.methods.length === 0) {
        return orderData.telegram ? `💬 Telegram: ${orderData.telegram}` : '';
    }
    const lines = cp.methods.map((m: string) => {
        let label = CONTACT_METHOD_LABELS[m] || m;
        if (m === 'telegram' && cp.telegramHandle) label += `: ${cp.telegramHandle}`;
        if (m === 'max' && cp.maxId) label += `: ${cp.maxId}`;
        return `• ${label}`;
    });
    return lines.join('<br>');
}

export async function sendEmailOrderNotification(orderData: any, orderId: string, isPaid: boolean) {
    const transporter = getTransporter();
    if (!transporter) return;

    try {
        const itemsHtml = orderData.items
            .map(
                (item: any) =>
                    `<li>${item.productTitle} x${item.quantity} — ${item.price * item.quantity}₽</li>`
            )
            .join('');

        const paymentLabel = orderData.paymentMethod === 'card'
            ? '💳 Банковская карта'
            : '🏦 Перевод по реквизитам';

        const statusLabel = isPaid
            ? '✅ Оплачен'
            : '⏳ Ожидает подтверждения';

        const contactHtml = formatContactPreferencesHtml(orderData);

        const emailHtml = `
            <h1>Новый заказ #${orderId.slice(-8).toUpperCase()}</h1>
            <p><strong>Клиент:</strong> ${orderData.customerName}</p>
            <p><strong>Email:</strong> ${orderData.email}</p>
            <p><strong>Телефон:</strong> ${orderData.phone}</p>
            <p><strong>Адрес:</strong> ${orderData.address}</p>
            ${orderData.customerNotes ? `<p><strong>Комментарий:</strong> ${orderData.customerNotes}</p>` : ''}
            ${contactHtml ? `<p><strong>Способы связи:</strong><br>${contactHtml}</p>` : ''}
            <h3>Товары:</h3>
            <ul>${itemsHtml}</ul>
            <h3>Итого: ${orderData.total}₽</h3>
            <p><strong>Способ оплаты:</strong> ${paymentLabel}</p>
            <p><strong>Статус:</strong> ${statusLabel}</p>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to: process.env.EMAIL_TO || process.env.SMTP_USER,
            subject: `Новый заказ #${orderId.slice(-8).toUpperCase()}`,
            html: emailHtml,
        });
    } catch (e) {
        console.error('Email Error:', e);
        throw e;
    }
}

export async function sendEmailFeedbackNotification(data: any) {
    const transporter = getTransporter();
    if (!transporter) return;

    try {
        const emailHtml = `
            <h2>Новое сообщение с сайта</h2>
            <p><strong>Телефон:</strong> ${data.phone}</p>
            ${data.telegram ? `<p><strong>Telegram:</strong> ${data.telegram}</p>` : ''}
            <h3>Сообщение:</h3>
            <p>${data.message.replace(/\n/g, '<br>')}</p>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to: process.env.EMAIL_TO || process.env.SMTP_USER,
            subject: `Сообщение с сайта от ${data.phone}`,
            html: emailHtml,
        });
    } catch (e) {
        console.error('Feedback Email Error:', e);
    }
}
