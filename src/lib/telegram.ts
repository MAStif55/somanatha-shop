import { Order } from '@/types/order';

const CONTACT_METHOD_LABELS: Record<string, string> = {
    telegram: '💬 Telegram',
    max: '📲 MAX',
    phone_call: '📞 Звонок',
    sms: '📱 SMS',
    email: '📧 Email',
};

const DELIVERY_TYPE_LABELS: Record<string, string> = {
    pickup_ozon: '📦 ПВЗ Ozon',
    pickup_yandex: '📦 ПВЗ Яндекс Маркет',
    home_address: '🏠 Почтой на адрес',
};

function escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
                    `  • ${escapeHtml(item.productTitle)} x${item.quantity} — ${item.price * item.quantity}₽`
            )
            .join('\n');

        const paymentMethodLabel = orderData.paymentMethod === 'card' ? '💳 Банковская карта' : '🏦 Перевод по реквизитам';
        const paymentStatusLabel = isPaid
            ? '✅ Оплачен'
            : '⏳ Ожидает подтверждения менеджером';

        const contactLines = formatContactPreferences(orderData);
        const contactSection = contactLines
            ? `\n📞 <b>Способы связи:</b>\n${escapeHtml(contactLines)}`
            : '';

        const message = `
🛒 <b>Новый заказ!</b>

📋 <b>Заказ #${escapeHtml(orderId.slice(-8).toUpperCase())}</b>

👤 <b>Клиент:</b> ${escapeHtml(orderData.customerName)}
📧 <b>Email:</b> ${escapeHtml(orderData.email)}
📱 <b>Телефон:</b> ${escapeHtml(orderData.phone)}
📍 <b>Доставка:</b> ${escapeHtml(DELIVERY_TYPE_LABELS[orderData.deliveryType] || 'Не указан')}
📍 <b>Адрес:</b> ${escapeHtml(orderData.address)}
${orderData.customerNotes ? `📝 <b>Комментарий:</b> ${escapeHtml(orderData.customerNotes)}` : ''}${contactSection}

📦 <b>Товары:</b>
${itemsList}

💰 <b>Итого:</b> ${orderData.total}₽
${escapeHtml(paymentMethodLabel)}
${escapeHtml(paymentStatusLabel)}
        `.trim();

        const telegramApi = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
        await fetch(`${telegramApi}/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
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
📩 <b>Новое сообщение с сайта!</b>

📱 <b>Телефон:</b> ${escapeHtml(data.phone)}
${data.telegram ? `💬 <b>Telegram:</b> ${escapeHtml(data.telegram)}` : ''}

✉️ <b>Сообщение:</b>
${escapeHtml(data.message)}
        `.trim();

        const telegramApi = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
        await fetch(`${telegramApi}/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
            }),
        });
    } catch (e) {
        console.error('Feedback Telegram Error:', e);
    }
}
