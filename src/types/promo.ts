export type PromoType = 'percentage' | 'fixed_amount' | 'free_shipping';

export interface PromoCode {
    id: string;
    code: string;             // Unique code, e.g. "SUMMER2026"
    type: PromoType;
    value: number;            // Discount value (percentage or fixed amount in currency)
    minOrderAmount?: number;  // Minimum order subtotal required to apply the promo
    maxUses?: number;         // Maximum total number of times this promo can be used
    usesCount: number;        // How many times it has been used
    validFrom?: number;       // Timestamp
    validUntil?: number;      // Timestamp
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
}
