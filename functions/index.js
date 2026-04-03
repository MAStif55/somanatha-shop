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

// ============================================================================
// BACKUP SYSTEM
// ============================================================================

const archiver = require('archiver');
const { stringify } = require('csv-stringify/sync');

/**
 * Sanitizes a field value to prevent CSV formula injection.
 * Prepends a single-quote to values that start with =, +, -, @, or a tab.
 */
function sanitizeCsvField(value) {
    if (typeof value !== 'string') return value;
    if (/^[=+\-@\t]/.test(value)) return `'${value}`;
    return value;
}

/**
 * Sanitizes all string fields in a flat object for CSV export.
 */
function sanitizeRow(row) {
    const out = {};
    for (const [key, val] of Object.entries(row)) {
        out[key] = typeof val === 'string' ? sanitizeCsvField(val) : val;
    }
    return out;
}

/**
 * Fetches all documents from a Firestore collection using cursor-based
 * pagination in pages of 500 to avoid memory spikes on large collections.
 */
async function fetchAllPaginated(collectionName) {
    const PAGE_SIZE = 500;
    const results = [];
    let lastDoc = null;

    while (true) {
        let q = db.collection(collectionName).orderBy('__name__').limit(PAGE_SIZE);
        if (lastDoc) q = q.startAfter(lastDoc);

        const snapshot = await q.get();
        if (snapshot.empty) break;

        snapshot.docs.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        if (snapshot.docs.length < PAGE_SIZE) break;
    }

    return results;
}

/**
 * Converts the products collection into a flat CSV string.
 */
function buildProductsCsv(products) {
    const rows = products.map(p => sanitizeRow({
        id: p.id || '',
        slug: p.slug || '',
        title_ru: (p.title && p.title.ru) ? p.title.ru : '',
        title_en: (p.title && p.title.en) ? p.title.en : '',
        short_description_ru: (p.shortDescription && p.shortDescription.ru) ? p.shortDescription.ru : '',
        short_description_en: (p.shortDescription && p.shortDescription.en) ? p.shortDescription.en : '',
        description_ru: (p.description && p.description.ru) ? p.description.ru : '',
        description_en: (p.description && p.description.en) ? p.description.en : '',
        base_price: p.basePrice || 0,
        category: p.category || '',
        subcategory: p.subcategory || '',
        tags: Array.isArray(p.tags) ? p.tags.join('; ') : '',
        image_count: Array.isArray(p.images) ? p.images.length : 0,
        has_video_preview: p.videoPreviewUrl ? 'yes' : 'no',
        has_video_full: p.videoUrl ? 'yes' : 'no',
        video_preview_url: p.videoPreviewUrl || '',
        video_url: p.videoUrl || '',
        created_at: p.createdAt ? new Date(p.createdAt).toISOString() : '',
        sort_order: p.order != null ? p.order : '',
    }));
    return stringify(rows, { header: true });
}

/**
 * Converts the orders collection into a flat CSV string.
 * Also returns a separate order_items array for the line-items CSV.
 */
function buildOrdersCsv(orders) {
    const orderRows = [];
    const itemRows = [];

    for (const o of orders) {
        orderRows.push(sanitizeRow({
            id: o.id || '',
            customer_name: o.customerName || '',
            email: o.email || '',
            phone: o.phone || '',
            address: o.address || '',
            address_details: o.addressDetails || '',
            contact_methods: (o.contactPreferences && Array.isArray(o.contactPreferences.methods))
                ? o.contactPreferences.methods.join('; ')
                : '',
            telegram_handle: (o.contactPreferences && o.contactPreferences.telegramHandle)
                ? o.contactPreferences.telegramHandle
                : (o.telegram || ''),
            max_id: (o.contactPreferences && o.contactPreferences.maxId)
                ? o.contactPreferences.maxId
                : '',
            customer_notes: o.customerNotes || '',
            items_count: Array.isArray(o.items) ? o.items.reduce((s, i) => s + (i.quantity || 1), 0) : 0,
            total: o.total || 0,
            payment_method: o.paymentMethod || '',
            payment_status: o.paymentStatus || '',
            order_status: o.status || '',
            created_at: o.createdAt ? new Date(o.createdAt).toISOString() : '',
            paid_at: o.paidAt ? new Date(o.paidAt).toISOString() : '',
        }));

        if (Array.isArray(o.items)) {
            for (const item of o.items) {
                itemRows.push(sanitizeRow({
                    order_id: o.id || '',
                    product_id: item.productId || '',
                    product_title: item.productTitle || '',
                    quantity: item.quantity || 1,
                    unit_price: item.price || 0,
                    line_total: (item.price || 0) * (item.quantity || 1),
                    configuration: item.configuration ? JSON.stringify(item.configuration) : '',
                }));
            }
        }
    }

    return {
        ordersCsv: stringify(orderRows, { header: true }),
        itemsCsv: stringify(itemRows, { header: true }),
    };
}

/**
 * Converts the customers collection into a flat CSV string.
 */
function buildCustomersCsv(customers) {
    const rows = customers.map(c => sanitizeRow({
        id: c.id || '',
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || '',
        order_count: c.orderCount || 0,
        total_spent: c.totalSpent || 0,
        created_at: c.createdAt ? new Date(c.createdAt).toISOString() : '',
    }));
    return stringify(rows, { header: true });
}

/**
 * Converts the reviews collection into a flat CSV string.
 */
function buildReviewsCsv(reviews) {
    const rows = reviews.map(r => sanitizeRow({
        id: r.id || '',
        product_id: r.productId || '',
        author: r.author || r.name || '',
        rating: r.rating || '',
        text: r.text || r.body || r.content || '',
        created_at: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    }));
    return stringify(rows, { header: true });
}

/**
 * Converts the subcategories collection into a flat CSV string.
 */
function buildSubcategoriesCsv(subcategories) {
    const rows = subcategories.map(s => sanitizeRow({
        id: s.id || '',
        name_ru: (s.name && s.name.ru) ? s.name.ru : (s.name || ''),
        name_en: (s.name && s.name.en) ? s.name.en : '',
        parent_category: s.parentCategory || s.category || '',
        slug: s.slug || '',
        sort_order: s.order != null ? s.order : '',
        created_at: s.createdAt ? new Date(s.createdAt).toISOString() : '',
    }));
    return stringify(rows, { header: true });
}

/**
 * Converts the options/variations collection into a flat CSV string.
 */
function buildVariationsCsv(options) {
    const rows = options.map(o => sanitizeRow({
        id: o.id || '',
        name_ru: (o.name && o.name.ru) ? o.name.ru : (o.name || ''),
        name_en: (o.name && o.name.en) ? o.name.en : '',
        type: o.type || '',
        created_at: o.createdAt ? new Date(o.createdAt).toISOString() : '',
    }));
    return stringify(rows, { header: true });
}

/**
 * Extracts all Storage file paths referenced in a product document.
 * Returns an array of { storagePath, zipPath } objects.
 */
function extractMediaPaths(product) {
    const paths = [];
    const productId = product.id;

    // Images: each item can be a string URL or a ProductImage object
    if (Array.isArray(product.images)) {
        product.images.forEach((img, idx) => {
            const variants = typeof img === 'string'
                ? [{ key: 'full', url: img }]
                : [
                    { key: 'full', url: img.url },
                    { key: 'card', url: img.cardUrl },
                    { key: 'thumb', url: img.thumbUrl },
                ].filter(v => v.url);

            variants.forEach(({ key, url }) => {
                const storagePath = extractStoragePath(url);
                if (storagePath) {
                    const ext = storagePath.split('.').pop() || 'webp';
                    const filename = `image_${String(idx + 1).padStart(3, '0')}_${key}.${ext}`;
                    paths.push({
                        storagePath,
                        zipPath: `media/images/${productId}/${filename}`,
                    });
                }
            });
        });
    }

    // Videos
    if (product.videoPreviewUrl) {
        const storagePath = extractStoragePath(product.videoPreviewUrl);
        if (storagePath) {
            paths.push({ storagePath, zipPath: `media/videos/${productId}/preview.mp4` });
        }
    }
    if (product.videoUrl) {
        const storagePath = extractStoragePath(product.videoUrl);
        if (storagePath) {
            paths.push({ storagePath, zipPath: `media/videos/${productId}/full.mp4` });
        }
    }

    return paths;
}

/**
 * Extracts the GCS object path from a Firebase Storage download URL.
 * Handles both gs:// and https://firebasestorage.googleapis.com URLs.
 */
function extractStoragePath(url) {
    if (!url) return null;
    if (url.startsWith('gs://')) {
        // gs://bucket-name/path/to/file -> path/to/file
        return url.replace(/^gs:\/\/[^\/]+\//, '');
    }
    try {
        const parsed = new URL(url);
        // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?...
        const match = parsed.pathname.match(/\/v0\/b\/[^\/]+\/o\/(.+)/);
        if (match) return decodeURIComponent(match[1]);
    } catch {
        // Not a valid URL, skip
    }
    return null;
}

/**
 * Downloads a single file from GCS and appends it to the archiver.
 * Resolves when the file has been fully piped into the archive.
 */
function addFileToArchive(archive, bucket, storagePath, zipPath) {
    return new Promise((resolve, reject) => {
        const file = bucket.file(storagePath);
        const readStream = file.createReadStream();

        readStream.on('error', (err) => {
            // Log but don't fail the whole backup for a single missing file
            console.warn(`[createBackup] Skipping missing file: ${storagePath} — ${err.message}`);
            resolve(); // resolve gracefully
        });

        archive.append(readStream, { name: zipPath });
        readStream.on('end', resolve);
    });
}

/**
 * createBackup — Firebase Callable Function
 *
 * Fetches all Firestore collections, generates CSV files, downloads all
 * product media from Storage, assembles a ZIP archive, uploads it to
 * the `backups/` bucket path, and returns a 60-minute signed download URL.
 *
 * Auth: requires Firebase Auth (admin must be logged in).
 * Timeout: 540 seconds (max). Memory: 1 GB.
 */
exports.createBackup = functions
    .runWith({ timeoutSeconds: 540, memory: '1GB' })
    .https.onCall(async (data, context) => {
        // 1. Auth guard — only authenticated admins may trigger backups
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'You must be logged in to create a backup.'
            );
        }

        const triggeredBy = context.auth.token.email || context.auth.uid;
        const startedAt = new Date();
        const timestamp = startedAt.toISOString().replace(/[:.]/g, '-');
        const zipFilename = `backup_${timestamp}.zip`;
        const zipStoragePath = `backups/${zipFilename}`;

        console.log(`[createBackup] Started by ${triggeredBy} at ${startedAt.toISOString()}`);

        try {
            // 2. Fetch all Firestore collections in parallel
            console.log('[createBackup] Fetching Firestore collections...');
            const [products, orders, customers, reviews, subcategories, options] = await Promise.all([
                fetchAllPaginated('products'),
                fetchAllPaginated('orders'),
                fetchAllPaginated('customers'),
                fetchAllPaginated('reviews'),
                fetchAllPaginated('subcategories'),
                fetchAllPaginated('options'),
            ]);

            // Fetch settings doc (single document, not a collection)
            let settingsData = {};
            try {
                const settingsSnap = await db.collection('settings').get();
                settingsSnap.forEach(doc => { settingsData[doc.id] = doc.data(); });
            } catch (e) {
                console.warn('[createBackup] Could not fetch settings:', e.message);
            }

            console.log(`[createBackup] Fetched: ${products.length} products, ${orders.length} orders, ${customers.length} customers, ${reviews.length} reviews`);

            // 3. Build CSV strings in memory
            const productsCsv = buildProductsCsv(products);
            const { ordersCsv, itemsCsv } = buildOrdersCsv(orders);
            const customersCsv = buildCustomersCsv(customers);
            const reviewsCsv = buildReviewsCsv(reviews);
            const subcategoriesCsv = buildSubcategoriesCsv(subcategories);
            const variationsCsv = buildVariationsCsv(options);
            const settingsJson = JSON.stringify(settingsData, null, 2);

            // 4. Build README
            const readmeTxt = [
                'SOMANATHA SHOP — DATA BACKUP',
                '='.repeat(40),
                `Generated:    ${startedAt.toISOString()}`,
                `Generated by: ${triggeredBy}`,
                '',
                'CONTENTS',
                '-'.repeat(40),
                `Products:      ${products.length} records  → data/products.csv`,
                `Orders:        ${orders.length} records  → data/orders.csv`,
                `Order items:   (normalized) → data/order_items.csv`,
                `Customers:     ${customers.length} records  → data/customers.csv`,
                `Reviews:       ${reviews.length} records  → data/reviews.csv`,
                `Subcategories: ${subcategories.length} records  → data/subcategories.csv`,
                `Variations:    ${options.length} records  → data/variations.csv`,
                `Settings:      (JSON)       → data/settings.json`,
                '',
                'MEDIA',
                '-'.repeat(40),
                'All product images (full, card 600px, thumb 300px) and videos',
                'are stored under media/images/<productId>/ and media/videos/<productId>/',
                '',
                'FORMAT NOTES',
                '-'.repeat(40),
                'All CSV files use comma separators and UTF-8 encoding.',
                'Dates are in ISO 8601 format (UTC).',
                'String fields starting with =, +, -, @ are prefixed with a',
                "single quote (') to prevent spreadsheet formula injection.",
            ].join('\n');

            // 5. Set up GCS bucket and ZIP upload stream
            const bucket = admin.storage().bucket();
            const zipFile = bucket.file(zipStoragePath);
            const uploadStream = zipFile.createWriteStream({
                metadata: {
                    contentType: 'application/zip',
                    metadata: {
                        generatedBy: triggeredBy,
                        generatedAt: startedAt.toISOString(),
                        productCount: String(products.length),
                        orderCount: String(orders.length),
                    },
                },
                resumable: false, // Simpler for smaller-medium files
            });

            // 6. Set up archiver in streaming mode
            const archive = archiver('zip', { zlib: { level: 6 } });

            // Pipe archiver output → GCS upload stream
            archive.pipe(uploadStream);

            // 7. Append all CSV/JSON/text files (in-memory, no disk I/O)
            archive.append(Buffer.from(productsCsv, 'utf-8'), { name: 'data/products.csv' });
            archive.append(Buffer.from(ordersCsv, 'utf-8'), { name: 'data/orders.csv' });
            archive.append(Buffer.from(itemsCsv, 'utf-8'), { name: 'data/order_items.csv' });
            archive.append(Buffer.from(customersCsv, 'utf-8'), { name: 'data/customers.csv' });
            archive.append(Buffer.from(reviewsCsv, 'utf-8'), { name: 'data/reviews.csv' });
            archive.append(Buffer.from(subcategoriesCsv, 'utf-8'), { name: 'data/subcategories.csv' });
            archive.append(Buffer.from(variationsCsv, 'utf-8'), { name: 'data/variations.csv' });
            archive.append(Buffer.from(settingsJson, 'utf-8'), { name: 'data/settings.json' });
            archive.append(Buffer.from(readmeTxt, 'utf-8'), { name: 'README.txt' });

            // 8. Download media files from Storage sequentially to control memory usage.
            //    Each file is streamed directly into the archive — never buffered in full.
            console.log('[createBackup] Starting media download...');
            let mediaCount = 0;
            let mediaSkipped = 0;

            for (const product of products) {
                const mediaPaths = extractMediaPaths(product);
                for (const { storagePath, zipPath } of mediaPaths) {
                    try {
                        await addFileToArchive(archive, bucket, storagePath, zipPath);
                        mediaCount++;
                    } catch (e) {
                        console.warn(`[createBackup] Skipped ${storagePath}:`, e.message);
                        mediaSkipped++;
                    }
                }
            }

            console.log(`[createBackup] Media: ${mediaCount} files added, ${mediaSkipped} skipped.`);

            // 9. Finalize the archive (flushes all pending entries)
            await archive.finalize();

            // 10. Wait for the upload to GCS to complete
            await new Promise((resolve, reject) => {
                uploadStream.on('finish', resolve);
                uploadStream.on('error', reject);
                archive.on('error', reject);
            });

            console.log(`[createBackup] ZIP uploaded to gs://.../${zipStoragePath}`);

            // 11. Generate a signed URL valid for 60 minutes
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
            const [signedUrl] = await zipFile.getSignedUrl({
                action: 'read',
                expires: expiresAt,
            });

            const durationMs = Date.now() - startedAt.getTime();
            console.log(`[createBackup] Done in ${Math.round(durationMs / 1000)}s. Signed URL created.`);

            return {
                success: true,
                downloadUrl: signedUrl,
                filename: zipFilename,
                generatedAt: startedAt.toISOString(),
                stats: {
                    products: products.length,
                    orders: orders.length,
                    customers: customers.length,
                    reviews: reviews.length,
                    mediaFiles: mediaCount,
                    mediaSkipped,
                    durationSeconds: Math.round(durationMs / 1000),
                },
            };

        } catch (error) {
            console.error('[createBackup] FATAL ERROR:', error);
            throw new functions.https.HttpsError(
                'internal',
                `Backup failed: ${error.message}`
            );
        }
    });

/**
 * cleanupOldBackups — Scheduled Cloud Function
 *
 * Runs every day at 03:00 UTC and deletes backup ZIP files older than 7 days
 * from the `backups/` path in Firebase Storage.
 */
exports.cleanupOldBackups = functions
    .pubsub.schedule('0 3 * * *')
    .timeZone('UTC')
    .onRun(async () => {
        const RETENTION_DAYS = 7;
        const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

        try {
            const bucket = admin.storage().bucket();
            const [files] = await bucket.getFiles({ prefix: 'backups/' });

            let deleted = 0;
            let skipped = 0;

            for (const file of files) {
                // Skip the directory placeholder itself
                if (file.name === 'backups/') { skipped++; continue; }

                const createdMs = file.metadata.timeCreated
                    ? new Date(file.metadata.timeCreated).getTime()
                    : 0;

                if (createdMs < cutoff) {
                    await file.delete();
                    deleted++;
                    console.log(`[cleanupOldBackups] Deleted: ${file.name}`);
                } else {
                    skipped++;
                }
            }

            console.log(`[cleanupOldBackups] Done. Deleted: ${deleted}, Kept: ${skipped}`);
        } catch (error) {
            console.error('[cleanupOldBackups] Error:', error);
        }

        return null;
    });
