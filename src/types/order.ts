/**
 * Order Types
 * 
 * Define your order structure here.
 */

export interface SelectedVariation {
    groupId: string;
    groupName: string;
    optionId: string;
    optionLabel: string;
    priceModifier: number;
}

export interface OrderItem {
    productId: string;
    productTitle: string;
    quantity: number;
    price: number;
    configuration?: Record<string, string>;
    selectedVariations?: SelectedVariation[];
}

export type ContactMethod = 'telegram' | 'max' | 'phone_call' | 'sms' | 'email';

export type DeliveryType = 'pickup_ozon' | 'pickup_yandex' | 'home_address';

export interface ContactPreferences {
    methods: ContactMethod[];
    telegramHandle?: string;
    maxId?: string;
}

export interface Order {
    id: string;
    customerName: string;
    email: string;
    phone: string;
    address: string;
    deliveryType?: DeliveryType;
    telegram?: string; // Legacy — kept for backward compat
    contactPreferences?: ContactPreferences;
    items: OrderItem[];
    total: number;
    status: 'pending' | 'completed' | 'cancelled' | 'archived';
    paymentMethod?: 'card' | 'bank_transfer';
    paymentId?: string;
    paymentStatus?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'awaiting_transfer';
    paymentUrl?: string;
    paidAt?: number;
    notes?: string; // Manager notes (admin only)
    customerNotes?: string; // Customer entered notes
    attachments?: string[]; // URLs of uploaded images
    createdAt: number; // Timestamp
}

export type OrderStatus = Order['status'];
