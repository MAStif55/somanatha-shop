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

function validateOrder(data) {
    if (!data.customerName || data.customerName.length < 2) return 'Invalid name';
    if (!data.email || !data.email.includes('@')) return 'Invalid email';
    if (!data.phone) return 'Invalid phone';
    if (!data.address || data.address.length < 10) return 'Invalid address';
    if (!['card', 'bank_transfer'].includes(data.paymentMethod)) return 'Invalid payment method';
    return null;
}

function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/([_*\[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

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

        const message = `
🛒 *Новый заказ\\!*

📋 *Заказ \\#${orderId.slice(-6).toUpperCase()}*

👤 *Клиент:* ${escapeMarkdown(orderData.customerName)}
📧 *Email:* ${escapeMarkdown(orderData.email)}
📱 *Телефон:* ${escapeMarkdown(orderData.phone)}
📍 *Адрес:* ${escapeMarkdown(orderData.address)}
${orderData.telegram ? `💬 *Telegram:* ${escapeMarkdown(orderData.telegram)}` : ''}
${orderData.customerNotes ? `📝 *Комментарий:* ${escapeMarkdown(orderData.customerNotes)}` : ''}

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

        const emailHtml = `
            <h1>Новый заказ #${orderId.slice(-6).toUpperCase()}</h1>
            <p><strong>Клиент:</strong> ${orderData.customerName}</p>
            <p><strong>Email:</strong> ${orderData.email}</p>
            <p><strong>Телефон:</strong> ${orderData.phone}</p>
            <p><strong>Адрес:</strong> ${orderData.address}</p>
            ${orderData.telegram ? `<p><strong>Telegram:</strong> ${orderData.telegram}</p>` : ''}
            ${orderData.customerNotes ? `<p><strong>Комментарий:</strong> ${orderData.customerNotes}</p>` : ''}
            <h3>Товары:</h3>
            <ul>${itemsHtml}</ul>
            <h3>Итого: ${orderData.total}₽</h3>
            <p><strong>Способ оплаты:</strong> ${paymentLabel}</p>
            <p><strong>Статус:</strong> ${statusLabel}</p>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to: process.env.EMAIL_TO || process.env.SMTP_USER,
            subject: `Новый заказ #${orderId.slice(-6).toUpperCase()}`,
            html: emailHtml,
        });
    } catch (e) {
        console.error('Email Error:', e);
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

            const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

            const orderItems = cartItems.map((item) => ({
                productId: item.productId,
                productTitle: item.productTitle.ru || item.productTitle,
                configuration: item.configuration || {},
                quantity: item.quantity,
                price: item.price,
            }));

            const paymentMethod = customerInfo.paymentMethod; // 'card' or 'bank_transfer'

            const orderData = {
                customerName: customerInfo.customerName,
                email: customerInfo.email,
                phone: customerInfo.phone,
                address: customerInfo.address,
                addressDetails: customerInfo.addressDetails || null,
                telegram: customerInfo.telegram || null,
                customerNotes: customerInfo.notes || null,
                items: orderItems,
                total,
                status: 'pending',
                paymentMethod: paymentMethod,
                paymentStatus: paymentMethod === 'card' ? 'pending' : 'awaiting_transfer',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
                const description = `Заказ #${orderId.slice(-6).toUpperCase()}: ${itemDescriptions}`.substring(0, 128);

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
                await Promise.all([
                    sendTelegramNotification(orderData, orderId, false),
                    sendEmailNotification(orderData, orderId, false),
                ]);

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
                paidAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Send notifications after card payment confirmed
            await Promise.all([
                sendTelegramNotification(orderData, orderId, true),
                sendEmailNotification(orderData, orderId, true),
            ]);

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
