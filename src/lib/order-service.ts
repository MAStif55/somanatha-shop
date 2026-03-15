/**
 * Order Service
 *
 * Client-side service for creating orders via the Cloud Function API.
 * All types are imported from their canonical locations.
 */

import { API } from './config';
import { CartItem } from '@/store/cart-store';
import { CheckoutFormData } from '@/lib/checkout-schema';

interface CreateOrderResult {
    success: boolean;
    orderId?: string;
    paymentUrl?: string;
    error?: string;
}

/**
 * Creates a new order via the API
 */
export async function createOrder(
    cartItems: CartItem[],
    customerInfo: CheckoutFormData,
    locale: string = 'ru'
): Promise<CreateOrderResult> {
    try {
        const response = await fetch(API.CREATE_ORDER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cartItems,
                customerInfo,
                locale,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to submit order');
        }

        return { success: true, orderId: result.orderId, paymentUrl: result.paymentUrl };
    } catch (error) {
        console.error('Error creating order:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
