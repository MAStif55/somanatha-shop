import { NextResponse } from 'next/server';
import { validateOrder, serializeProductTitle, calculateGiftDiscount } from '@/utils/order';
import { sendTelegramOrderNotification } from '@/lib/telegram';
import { sendEmailOrderNotification } from '@/lib/mailer';
import { createYooKassaPayment } from '@/lib/yookassa';
import { OrderRepository } from '@/lib/data';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cartItems, customerInfo, locale } = body;

        // Validation
        const error = validateOrder(customerInfo);
        if (error) {
            return NextResponse.json({ success: false, error }, { status: 400 });
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
        const total = Math.max(0, subtotal - giftDiscount);

        const paymentMethod = customerInfo.paymentMethod; // 'card' or 'bank_transfer'
        const contactPreferences = customerInfo.contactPreferences || null;
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
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'card' ? 'pending' : 'awaiting_transfer',
        };

        // 1. Save order to MongoDB (or fallback)
        const orderId = await OrderRepository.create(orderData as any);
        
        // Let's create a full mock of the orderData so the emails fire nicely
        const fullOrderData = { ...orderData, id: orderId, status: 'pending', createdAt: Date.now() };

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
                await OrderRepository.update(orderId, { notificationStatus });
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
