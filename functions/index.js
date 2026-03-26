const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });
const { v4: uuidv4 } = require('uuid');

admin.initializeApp();
const db = admin.firestore();

// Cached SMTP transporter — reused across function invocations
let _transporter = null;
function getTransporter() {
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

// ============================================================================
// HELPERS
// ============================================================================

const VALID_CONTACT_METHODS = ['telegram', 'max', 'phone_call', 'sms', 'email'];
const PHONE_REGEX = /^(\+7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateOrder(data) {
    // Name: min 2, max 100
    if (!data.customerName || typeof data.customerName !== 'string') return 'Invalid name';
    if (data.customerName.length < 2 || data.customerName.length > 100) return 'Name must be 2–100 characters';

    // Email: standard format
    if (!data.email || !EMAIL_REGEX.test(data.email)) return 'Invalid email';

    // Phone: Russian format
    if (!data.phone || !PHONE_REGEX.test(data.phone)) return 'Invalid phone number';

    // Address: min 10, max 500
    if (!data.address || typeof data.address !== 'string') return 'Invalid address';
    if (data.address.length < 10 || data.address.length > 500) return 'Address must be 10–500 characters';

    // Customer notes: max 1000 (optional)
    if (data.notes && typeof data.notes === 'string' && data.notes.length > 1000) {
        return 'Notes must be under 1000 characters';
    }

    // Payment method: enum
    if (!['card', 'bank_transfer'].includes(data.paymentMethod)) return 'Invalid payment method';

    // Contact preferences validation
    const cp = data.contactPreferences;
    if (cp) {
        if (!cp.methods || !Array.isArray(cp.methods) || cp.methods.length === 0) {
            return 'Select at least one contact method';
        }
        for (const method of cp.methods) {
            if (!VALID_CONTACT_METHODS.includes(method)) {
                return `Invalid contact method: ${method}`;
            }
        }
        if (cp.methods.includes('telegram')) {
            if (!cp.telegramHandle || typeof cp.telegramHandle !== 'string' || cp.telegramHandle.trim() === '') {
                return 'Telegram handle is required';
            }
            if (!cp.telegramHandle.startsWith('@')) {
                return 'Telegram handle must start with @';
            }
        }
        if (cp.methods.includes('max')) {
            if (!cp.maxId || typeof cp.maxId !== 'string' || cp.maxId.trim() === '') {
                return 'MAX ID is required';
            }
        }
    }

    return null;
}

/**
 * Safely serialize a product title to a plain string.
 * Handles both { en, ru } objects and plain strings from the cart.
 */
function serializeProductTitle(title) {
    if (!title) return '';
    if (typeof title === 'string') return title;
    if (typeof title === 'object' && title !== null) {
        return title.ru || title.en || JSON.stringify(title);
    }
    return String(title);
}

/**
 * Server-side gift discount calculation.
 * Mirrors the client-side logic: every 11th item is free (cheapest first).
 */
function calculateGiftDiscount(items) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const freeItemCount = Math.floor(totalItems / 11);
    if (freeItemCount === 0) return 0;

    // Flatten into individual units with their prices
    const units = [];
    items.forEach((item) => {
        for (let i = 0; i < item.quantity; i++) {
            units.push(item.price);
        }
    });

    // Sort ascending — discount the cheapest items
    units.sort((a, b) => a - b);

    let discount = 0;
    for (let i = 0; i < freeItemCount; i++) {
        discount += units[i];
    }
    return discount;
}

function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/([_*\[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

const CONTACT_METHOD_LABELS = {
    telegram: '💬 Telegram',
    max: '📲 MAX',
    phone_call: '📞 Звонок',
    sms: '📱 SMS',
    email: '📧 Email',
};

function formatContactPreferences(orderData) {
    const cp = orderData.contactPreferences;
    if (!cp || !cp.methods || cp.methods.length === 0) {
        // Legacy fallback
        return orderData.telegram ? `💬 Telegram: ${orderData.telegram}` : '';
    }
    const lines = cp.methods.map(m => {
        let label = CONTACT_METHOD_LABELS[m] || m;
        if (m === 'telegram' && cp.telegramHandle) label += `: ${cp.telegramHandle}`;
        if (m === 'max' && cp.maxId) label += `: ${cp.maxId}`;
        return `  • ${label}`;
    });
    return lines.join('\n');
}

async function sendTelegramNotification(orderData, orderId, isPaid) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) return;

    try {
        const itemsList = orderData.items
            .map(
                (item) =>
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

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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

async function sendEmailNotification(orderData, orderId, isPaid) {
    const transporter = getTransporter();
    if (!transporter) return;

    try {
        const itemsHtml = orderData.items
            .map(
                (item) =>
                    `<li>${item.productTitle} x${item.quantity} — ${item.price * item.quantity}₽</li>`
            )
            .join('');

        const paymentLabel = orderData.paymentMethod === 'card'
            ? '💳 Банковская карта'
            : '🏦 Перевод по реквизитам';

        const statusLabel = isPaid
            ? '✅ Оплачен'
            : '⏳ Ожидает подтверждения';

        const contactHtml = formatContactPreferences(orderData).replace(/\n/g, '<br>');

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

async function sendFeedbackTelegram(data) {
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

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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

async function sendFeedbackEmail(data) {
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

// ============================================================================
// YOOKASSA HELPER
// ============================================================================

async function createYooKassaPayment(amount, orderId, customerEmail, description) {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
        throw new Error('YooKassa credentials not configured');
    }

    const idempotenceKey = uuidv4();
    const returnUrl = `https://somanatha.ru/payment-result?orderId=${orderId}`;

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Idempotence-Key': idempotenceKey,
            'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64'),
        },
        body: JSON.stringify({
            amount: {
                value: amount.toFixed(2),
                currency: 'RUB',
            },
            confirmation: {
                type: 'redirect',
                return_url: returnUrl,
            },
            capture: true,
            description: description,
            metadata: {
                order_id: orderId,
            },
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('YooKassa API error:', response.status, errorBody);
        throw new Error(`YooKassa API error: ${response.status}`);
    }

    return await response.json();
}

// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================

/**
 * createOrder - Creates order in Firestore.
 *   paymentMethod = 'card'          → creates YooKassa payment, returns paymentUrl
 *   paymentMethod = 'bank_transfer' → saves order as awaiting_transfer, sends notifications, returns orderId
 */
exports.createOrder = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const { cartItems, customerInfo, locale } = req.body;

            // Validation
            const error = validateOrder(customerInfo);
            if (error) {
                return res.status(400).json({ success: false, error });
            }

            const orderItems = cartItems.map((item) => ({
                productId: item.productId,
                productTitle: serializeProductTitle(item.productTitle),
                configuration: item.configuration || {},
                quantity: item.quantity,
                price: item.price,
            }));

            // Server-side price calculation (source of truth)
            const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const giftDiscount = calculateGiftDiscount(orderItems);
            const total = Math.max(0, subtotal - giftDiscount);

            const paymentMethod = customerInfo.paymentMethod; // 'card' or 'bank_transfer'

            // Extract contact preferences
            const contactPreferences = customerInfo.contactPreferences || null;
            // Legacy telegram field for backward compat
            const telegramHandle = contactPreferences?.telegramHandle || customerInfo.telegram || null;

            const orderData = {
                customerName: customerInfo.customerName,
                email: customerInfo.email,
                phone: customerInfo.phone,
                address: customerInfo.address,
                addressDetails: customerInfo.addressDetails || null,
                telegram: telegramHandle,
                contactPreferences: contactPreferences,
                customerNotes: customerInfo.notes || null,
                items: orderItems,
                total,
                status: 'pending',
                paymentMethod: paymentMethod,
                paymentStatus: paymentMethod === 'card' ? 'pending' : 'awaiting_transfer',
                createdAt: Date.now(),
            };

            // 1. Save order to Firestore
            const docRef = await db.collection('orders').add(orderData);
            const orderId = docRef.id;

            // 2. Handle payment method
            if (paymentMethod === 'card') {
                // --- CARD: create YooKassa payment ---
                const itemDescriptions = orderItems
                    .map((item) => `${item.productTitle} x${item.quantity}`)
                    .join(', ');
                const description = `Заказ #${orderId.slice(-8).toUpperCase()}: ${itemDescriptions}`.substring(0, 128);

                try {
                    const payment = await createYooKassaPayment(
                        total,
                        orderId,
                        customerInfo.email,
                        description
                    );

                    await docRef.update({
                        paymentId: payment.id,
                        paymentUrl: payment.confirmation.confirmation_url,
                    });

                    return res.status(200).json({
                        success: true,
                        orderId,
                        paymentMethod: 'card',
                        paymentUrl: payment.confirmation.confirmation_url,
                    });
                } catch (paymentError) {
                    console.error('Payment creation error:', paymentError);
                    await docRef.update({ paymentStatus: 'failed' });
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to create payment. Please try again.',
                    });
                }
            } else {
                // --- BANK TRANSFER: order placed, manager will approve ---
                // Send notifications immediately so the manager knows
                const [telegramResult, emailResult] = await Promise.allSettled([
                    sendTelegramNotification(orderData, orderId, false),
                    sendEmailNotification(orderData, orderId, false),
                ]);

                // Log notification failures to the order document
                const notificationStatus = {};
                if (telegramResult.status === 'rejected') {
                    notificationStatus.telegramError = telegramResult.reason?.message || 'Unknown error';
                }
                if (emailResult.status === 'rejected') {
                    notificationStatus.emailError = emailResult.reason?.message || 'Unknown error';
                }
                if (Object.keys(notificationStatus).length > 0) {
                    await docRef.update({ notificationStatus });
                }

                return res.status(200).json({
                    success: true,
                    orderId,
                    paymentMethod: 'bank_transfer',
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    });
});

/**
 * yookassaWebhook - Receives payment status updates from YooKassa
 */
exports.yookassaWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const event = req.body;

        if (!event || !event.event || !event.object) {
            console.error('Invalid webhook payload:', JSON.stringify(req.body));
            return res.status(400).json({ error: 'Invalid payload' });
        }

        const payment = event.object;
        const paymentId = payment.id;
        const orderId = payment.metadata?.order_id;

        console.log(`Webhook received: ${event.event} for payment ${paymentId}, order ${orderId}`);

        if (!orderId) {
            console.error('No order_id in payment metadata');
            return res.status(200).json({ status: 'ok' });
        }

        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            console.error(`Order ${orderId} not found`);
            return res.status(200).json({ status: 'ok' });
        }

        const orderData = orderDoc.data();

        if (event.event === 'payment.succeeded') {
            await orderRef.update({
                paymentStatus: 'paid',
                paymentId: paymentId,
                paidAt: Date.now(),
            });

            // Send notifications after card payment confirmed
            const [telegramResult, emailResult] = await Promise.allSettled([
                sendTelegramNotification(orderData, orderId, true),
                sendEmailNotification(orderData, orderId, true),
            ]);

            // Log notification failures to the order document
            const notificationStatus = {};
            if (telegramResult.status === 'rejected') {
                notificationStatus.telegramError = telegramResult.reason?.message || 'Unknown error';
            }
            if (emailResult.status === 'rejected') {
                notificationStatus.emailError = emailResult.reason?.message || 'Unknown error';
            }
            if (Object.keys(notificationStatus).length > 0) {
                await orderRef.update({ notificationStatus });
            }

            console.log(`Order ${orderId} payment confirmed, notifications sent`);
        } else if (event.event === 'payment.canceled') {
            await orderRef.update({
                paymentStatus: 'cancelled',
                paymentId: paymentId,
            });
            console.log(`Order ${orderId} payment cancelled`);
        }

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(200).json({ status: 'ok' });
    }
});

/**
 * submitFeedback - Receives contact form submissions, sends to Telegram and email.
 */
/**
 * triggerDeploy - Callable function to trigger a GitHub Actions deployment.
 * Requires the caller to be authenticated via Firebase Auth.
 * The GitHub PAT must be set via: firebase functions:secrets:set GITHUB_PAT
 */
exports.triggerDeploy = functions
    .runWith({ secrets: ['GITHUB_PAT'] })
    .https.onCall(async (data, context) => {
        // 1. Verify the caller is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'You must be logged in to trigger a deploy.'
            );
        }

        const githubPat = process.env.GITHUB_PAT;
        if (!githubPat) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'GitHub PAT is not configured. Run: firebase functions:secrets:set GITHUB_PAT'
            );
        }

        try {
            const response = await fetch(
                'https://api.github.com/repos/MAStif55/somanatha-shop/dispatches',
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': `token ${githubPat}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        event_type: 'trigger-deploy',
                        client_payload: {
                            triggered_by: context.auth.token.email || context.auth.uid,
                            timestamp: new Date().toISOString(),
                        },
                    }),
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('GitHub API error:', response.status, errorBody);
                throw new functions.https.HttpsError(
                    'internal',
                    `GitHub API returned ${response.status}`
                );
            }

            return { success: true, message: 'Deploy triggered successfully' };
        } catch (error) {
            if (error instanceof functions.https.HttpsError) throw error;
            console.error('triggerDeploy error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to trigger deploy');
        }
    });

exports.submitFeedback = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const { message, phone, telegram } = req.body;

            // Validation
            if (!message || message.trim().length < 2) {
                return res.status(400).json({ success: false, error: 'Message is required' });
            }
            if (!phone || phone.trim().length < 5) {
                return res.status(400).json({ success: false, error: 'Phone number is required' });
            }

            const feedbackData = {
                message: message.trim(),
                phone: phone.trim(),
                telegram: telegram ? telegram.trim() : null,
            };

            // Send notifications in parallel
            await Promise.all([
                sendFeedbackTelegram(feedbackData),
                sendFeedbackEmail(feedbackData),
            ]);

            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Feedback error:', error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    });
});
