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

const DELIVERY_TYPE_LABELS: Record<string, string> = {
    pickup_ozon: '📦 ПВЗ Ozon',
    pickup_yandex: '📦 ПВЗ Яндекс Маркет',
    home_address: '🏠 Почтой на адрес',
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
                (item: any) => {
                    let html = `<li><strong>${item.productTitle}</strong> x${item.quantity} — ${item.price * item.quantity}₽`;
                    if (item.configuration && Object.keys(item.configuration).length > 0) {
                        html += `<br><span style="color: #666; font-size: 0.9em;"><em>${Object.values(item.configuration).join(', ')}</em></span>`;
                    }
                    html += `</li>`;
                    return html;
                }
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
            <p><strong>Доставка:</strong> ${DELIVERY_TYPE_LABELS[orderData.deliveryType] || 'Не указан'}</p>
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

/**
 * Send Magic Link login email to customer
 */
export async function sendMagicLinkEmail(email: string, magicLink: string) {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn('[Mailer] SMTP not configured. Here is the magic link:', magicLink);
        return;
    }

    try {
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #FAFAFA; color: #334155; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">Вход в Личный Кабинет</h2>
                <p>Здравствуйте!</p>
                <p>Для входа в ваш личный кабинет в мастерской Somanatha нажмите на кнопку ниже:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${magicLink}" style="background-color: #C9A227; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Войти в Личный Кабинет
                    </a>
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 25px;">Эта ссылка действительна в течение 1 часа и может быть использована только один раз.</p>
                <p style="font-size: 12px; color: #64748b;">Если вы не запрашивали эту ссылку, просто проигнорируйте это письмо.</p>
            </div>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Ссылка для входа в Личный Кабинет',
            html: emailHtml,
        });
    } catch (e) {
        console.error('Magic Link Email Error:', e);
        throw e;
    }
}

/**
 * Send notification to customer that master replied
 */
export async function sendEmailNewChatMessage(email: string, orderId: string, messageText: string, link: string) {
    const transporter = getTransporter();
    if (!transporter) return;

    try {
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #FAFAFA; color: #334155; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h2 style="color: #2c3e50; margin-bottom: 20px;">Новое сообщение по заказу #${orderId.slice(-8).toUpperCase()}</h2>
                <p>Здравствуйте!</p>
                <p>Мастер отправил вам сообщение в чате заказа:</p>
                <blockquote style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #C9A227; border-radius: 4px; margin: 20px 0; color: #334155; font-style: italic;">
                    ${messageText.replace(/\n/g, '<br>')}
                </blockquote>
                <div style="text-align: center; margin: 25px 0;">
                    <a href="${link}" style="background-color: #C9A227; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Перейти к обсуждению в чате
                    </a>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: `Новое сообщение по заказу #${orderId.slice(-8).toUpperCase()}`,
            html: emailHtml,
        });
    } catch (e) {
        console.error('Chat Email Notification Error:', e);
    }
}

/**
 * Send notification to customer that order is approved and awaiting payment
 */
export async function sendEmailOrderApproved(email: string, orderId: string, total: number, paymentLink: string) {
    const transporter = getTransporter();
    if (!transporter) return;

    try {
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #FAFAFA; color: #334155; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">Макет утвержден! Выставлен счет</h2>
                <p>Здравствуйте!</p>
                <p>Мастер утвердил макет для вашего заказа <strong>#${orderId.slice(-8).toUpperCase()}</strong>.</p>
                <p>Итоговая стоимость заказа к оплате: <strong>${total}₽</strong>.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${paymentLink}" style="background-color: #C9A227; color: #ffffff; padding: 12px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                        Оплатить заказ
                    </a>
                </div>
                <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 25px;">
                    Вы также можете зайти в свой личный кабинет, чтобы увидеть историю обсуждения и макеты.
                </p>
            </div>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: `Счет на оплату заказа #${orderId.slice(-8).toUpperCase()}`,
            html: emailHtml,
        });
    } catch (e) {
        console.error('Order Approved Email Notification Error:', e);
    }
}
