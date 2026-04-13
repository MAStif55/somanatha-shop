import { Order } from '@/types/order';

const CONTACT_METHOD_LABELS: Record<string, string> = {
    telegram: '💬 Telegram',
    max: '📲 MAX',
    phone_call: '📞 Звонок',
    sms: '📱 SMS',
    email: '📧 Email',
};

function escapeMarkdown(text: string | null | undefined): string {
    if (!text) return '';
    return text.replace(/([_*\[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}

function formatContactPreferences(orderData: any): string {
    const cp = orderData.contactPreferences;
    if (!cp || !cp.methods || cp.methods.length === 0) {
        return orderData.telegram ? `💬 Telegram: ${orderData.telegram}` : '';
    }
    const lines = cp.methods.map((m: string) => {
        let label = CONTACT_METHOD_LABELS[m] || m;
        if (m === 'telegram' && cp.telegramHandle) label += `: ${cp.telegramHandle}`;
        if (m === 'max' && cp.maxId) label += `: ${cp.maxId}`;
        return `  • ${label}`;
    });
    return lines.join('\n');
}

export async function sendTelegramOrderNotification(orderData: any, orderId: string, isPaid: boolean) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) return;

    try {
        const itemsList = orderData.items
            .map(
                (item: any) =>
                    `  • ${escapeMarkdown(item.productTitle)} x${item.quantity} — ${item.price * item.quantity}₽`
            )
            .join('\n');

        const paymentMethodLabel = orderData.paymentMethod === 'card' ? '💳 Банковская карта' : '🏦 Перевод по реквизитам';
        const paymentStatusLabel = isPaid
            ? '✅ Оплачен'
            : '⏳ Ожидает подтверждения менеджером';

        const contactLines = formatContactPreferences(orderData);
        const contactSection = contactLines
            ? `\n📞 *Способы связи:*\n${escapeMarkdown(contactLines)}`
            : '';

        const message = `
🛒 *Новый заказ\\!*

📋 *Заказ \\#${orderId.slice(-8).toUpperCase()}*

👤 *Клиент:* ${escapeMarkdown(orderData.customerName)}
📧 *Email:* ${escapeMarkdown(orderData.email)}
📱 *Телефон:* ${escapeMarkdown(orderData.phone)}
📍 *Адрес:* ${escapeMarkdown(orderData.address)}
${orderData.customerNotes ? `📝 *Комментарий:* ${escapeMarkdown(orderData.customerNotes)}` : ''}${contactSection}

📦 *Товары:*
${itemsList}

💰 *Итого:* ${orderData.total}₽
${escapeMarkdown(paymentMethodLabel)}
${escapeMarkdown(paymentStatusLabel)}
        `.trim();

        const telegramApi = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
        await fetch(`${telegramApi}/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'MarkdownV2',
            }),
        });
    } catch (e) {
        console.error('Telegram Error:', e);
        throw e;
    }
}

export async function sendTelegramFeedbackNotification(data: any) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) return;

    try {
        const message = `
📩 *Новое сообщение с сайта\\!*

📱 *Телефон:* ${escapeMarkdown(data.phone)}
${data.telegram ? `💬 *Telegram:* ${escapeMarkdown(data.telegram)}` : ''}

✉️ *Сообщение:*
${escapeMarkdown(data.message)}
        `.trim();

        const telegramApi = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
        await fetch(`${telegramApi}/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'MarkdownV2',
            }),
        });
    } catch (e) {
        console.error('Feedback Telegram Error:', e);
    }
}
