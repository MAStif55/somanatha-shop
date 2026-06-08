import { NextResponse } from 'next/server';
import { validateOrder, serializeProductTitle, calculateGiftDiscount } from '@/utils/order';
import { sendTelegramOrderNotification } from '@/lib/telegram';
import { sendEmailOrderNotification } from '@/lib/mailer';
import { createYooKassaPayment } from '@/lib/yookassa';
import { OrderRepository, PromoRepository } from '@/lib/data';
import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3';

const BUCKET_NAME = process.env.YC_S3_BUCKET || 'somanatha-media';
const REGION = process.env.YC_S3_REGION || 'ru-central1';
const ENDPOINT = process.env.YC_S3_ENDPOINT || 'https://storage.yandexcloud.net';

const s3Client = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    credentials: {
        accessKeyId: process.env.YC_S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.YC_S3_SECRET_ACCESS_KEY || '',
    },
});

async function copyAttachmentsToPermanent(attachments: string[], orderId: string): Promise<string[]> {
    const permanentUrls: string[] = [];
    
    for (const url of attachments) {
        if (!url.includes('temp-uploads/')) {
            permanentUrls.push(url);
            continue;
        }

        try {
            const tempUploadsIndex = url.indexOf('temp-uploads/');
            if (tempUploadsIndex === -1) {
                permanentUrls.push(url);
                continue;
            }

            const sourceKey = url.substring(tempUploadsIndex);
            const filename = sourceKey.substring(sourceKey.lastIndexOf('/') + 1);
            const targetKey = `orders/${orderId}/${filename}`;

            await s3Client.send(new CopyObjectCommand({
                Bucket: BUCKET_NAME,
                CopySource: `/${BUCKET_NAME}/${sourceKey}`,
                Key: targetKey,
            }));

            const permanentUrl = `${ENDPOINT}/${BUCKET_NAME}/${targetKey}`;
            permanentUrls.push(permanentUrl);
        } catch (err) {
            console.error(`Failed to copy S3 attachment ${url} to permanent folder:`, err);
            permanentUrls.push(url);
        }
    }

    return permanentUrls;
}

async function verifyTurnstileToken(token: string) {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        console.warn('[Turnstile] No TURNSTILE_SECRET_KEY configured, bypassing verification.');
        return true;
    }
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
        });
        const outcome = await response.json();
        return outcome.success;
    } catch (err) {
        console.error('[Turnstile] Verification error:', err);
        return false;
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cartItems, customerInfo, promoCode } = body;

        // Validation
        const error = validateOrder(customerInfo);
        if (error) {
            return NextResponse.json({ success: false, error }, { status: 400 });
        }

        // Captcha validation
        if (customerInfo.captchaToken) {
            const isHuman = await verifyTurnstileToken(customerInfo.captchaToken);
            if (!isHuman) {
                return NextResponse.json({ success: false, error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 });
            }
        }

        const orderItems = cartItems.map((item: any) => ({
            productId: item.productId,
            productTitle: serializeProductTitle(item.productTitle),
            configuration: item.configuration || {},
            quantity: item.quantity,
            price: item.price,
        }));

        // Server-side price calculation (source of truth)
        const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
        const giftDiscount = calculateGiftDiscount(orderItems);
        let baseTotal = Math.max(0, subtotal - giftDiscount);

        let promoDiscount = 0;
        let appliedPromo = null;

        // Validate promo code
        if (promoCode) {
            const promo = await PromoRepository.getPromoByCode(promoCode);
            const now = Date.now();
            if (promo && promo.isActive && 
                (!promo.validFrom || now >= promo.validFrom) && 
                (!promo.validUntil || now <= promo.validUntil) &&
                (!promo.maxUses || promo.usesCount < promo.maxUses) &&
                (!promo.minOrderAmount || baseTotal >= promo.minOrderAmount)) {
                
                appliedPromo = promo;
                if (promo.type === 'percentage') {
                    promoDiscount = (baseTotal * promo.value) / 100;
                } else if (promo.type === 'fixed_amount') {
                    promoDiscount = Math.min(promo.value, baseTotal);
                }
                baseTotal = Math.max(0, baseTotal - promoDiscount);
            }
        }

        // Fetch settings for shipping calculations
        const { SettingsRepository } = await import('@/lib/data');
        const settings = await SettingsRepository.getSettings();
        const shippingCost = settings.shipping?.price ?? 350;
        const freeShippingThreshold = settings.shipping?.freeThreshold ?? 3000;

        let finalShippingCost = 0;
        if (appliedPromo && appliedPromo.type === 'free_shipping') {
            finalShippingCost = 0;
        } else if (baseTotal < freeShippingThreshold) {
            finalShippingCost = shippingCost;
        }

        baseTotal += finalShippingCost;

        const paymentMethod = customerInfo.paymentMethod; // 'card' or 'bank_transfer'
        
        let total = baseTotal;
        if (paymentMethod === 'card') {
            // Add 3.5% YooKassa fee
            total = baseTotal + (baseTotal * 0.035);
        }
        const contactPreferences = customerInfo.contactPreferences || null;
        const telegramHandle = contactPreferences?.telegramHandle || customerInfo.telegram || null;

        const orderData = {
            customerName: customerInfo.customerName,
            email: customerInfo.email,
            phone: customerInfo.phone,
            address: customerInfo.address,
            deliveryType: customerInfo.deliveryType || 'home_address',
            addressDetails: customerInfo.addressDetails || null,
            telegram: telegramHandle,
            contactPreferences: contactPreferences,
            customerNotes: customerInfo.notes || null,
            items: orderItems,
            promoCode: appliedPromo ? appliedPromo.code : null,
            promoDiscount: promoDiscount > 0 ? promoDiscount : null,
            total,
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'card' ? 'pending' : 'awaiting_transfer',
            attachments: customerInfo.attachments || [],
        };

        // 1. Save order to MongoDB (or fallback)
        const orderId = await OrderRepository.create(orderData as any);

        // Copy S3 attachments to permanent folder and update order doc
        let finalAttachments = orderData.attachments;
        if (orderData.attachments.length > 0) {
            finalAttachments = await copyAttachmentsToPermanent(orderData.attachments, orderId);
            await OrderRepository.update(orderId, { attachments: finalAttachments } as any);
        }

        if (appliedPromo && paymentMethod !== 'card') {
            await PromoRepository.incrementUsesCount(appliedPromo.id);
        }
        
        // Let's create a full mock of the orderData so the emails fire nicely
        const fullOrderData = { ...orderData, attachments: finalAttachments, id: orderId, status: 'pending', createdAt: Date.now() };

        // 2. Handle payment method
        if (paymentMethod === 'card') {
            const itemDescriptions = orderItems
                .map((item: any) => `${item.productTitle} x${item.quantity}`)
                .join(', ');
            const description = `Заказ #${orderId.slice(-8).toUpperCase()}: ${itemDescriptions}`.substring(0, 128);

            try {
                const payment = await createYooKassaPayment(
                    total,
                    orderId,
                    customerInfo.email,
                    description
                );

                await OrderRepository.update(orderId, {
                    paymentId: payment.id,
                    paymentUrl: payment.confirmation.confirmation_url,
                });

                return NextResponse.json({
                    success: true,
                    orderId,
                    paymentMethod: 'card',
                    paymentUrl: payment.confirmation.confirmation_url,
                });
            } catch (paymentError) {
                console.error('Payment creation error:', paymentError);
                await OrderRepository.update(orderId, { paymentStatus: 'failed' });
                return NextResponse.json({
                    success: false,
                    error: 'Failed to create payment. Please try again.',
                }, { status: 500 });
            }
        } else {
            // --- BANK TRANSFER ---
            // Send notifications immediately so the manager knows
            const [telegramResult, emailResult] = await Promise.allSettled([
                sendTelegramOrderNotification(fullOrderData, orderId, false),
                sendEmailOrderNotification(fullOrderData, orderId, false),
            ]);

            const notificationStatus: any = {};
            if (telegramResult.status === 'rejected') {
                notificationStatus.telegramError = telegramResult.reason?.message || 'Unknown error';
            }
            if (emailResult.status === 'rejected') {
                notificationStatus.emailError = emailResult.reason?.message || 'Unknown error';
            }
            if (Object.keys(notificationStatus).length > 0) {
                await OrderRepository.update(orderId, { notificationStatus } as any);
            }

            return NextResponse.json({
                success: true,
                orderId,
                paymentMethod: 'bank_transfer',
            });
        }
    } catch (error) {
        console.error('Create Checkout Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
