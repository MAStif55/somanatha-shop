import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Cart Store with Zustand
 * 
 * A persistent shopping cart that saves to localStorage.
 * Customize the CartItem interface for your product types.
 */

// ============================================================================
// TYPES - Customize these for your product
// ============================================================================

export interface CartItem {
    id: string;                              // Unique cart entry ID
    productId: string;                       // Product ID from database
    productSlug?: string;                    // Product URL slug for linking
    productTitle: { en: string; ru: string }; // Localized title snapshot
    productImage: string;                    // Image URL
    configuration?: Record<string, string>;  // Product-specific options
    price: number;                           // Calculated price
    quantity: number;                        // Quantity in cart
}

interface CartState {
    items: CartItem[];
    _shippingPrice: number;
    _shippingFreeThreshold: number;
    addItem: (item: Omit<CartItem, 'id'>) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    getTotalPrice: () => number;
    getTotalItems: () => number;
    getFreeShippingThreshold: () => number;
    isFreeShippingEligible: () => boolean;
    getGiftThreshold: () => number;
    getDiscount: () => number;
    getShippingCost: () => number;
    getFinalPrice: () => number;
    setShippingConfig: (price: number, freeThreshold: number) => void;
}

// ============================================================================
// STORE CONFIGURATION
// ============================================================================

// Change this to customize the localStorage key
const STORAGE_KEY = 'ecommerce-cart';

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            _shippingPrice: 350,
            _shippingFreeThreshold: 3000,

            addItem: (newItem) => {
                const { items } = get();

                // Helper to deep equal two simple objects ignoring key order
                const isConfigEqual = (a: any, b: any) => {
                    const keysA = Object.keys(a || {}).sort();
                    const keysB = Object.keys(b || {}).sort();
                    if (keysA.length !== keysB.length) return false;
                    for (let i = 0; i < keysA.length; i++) {
                        if (keysA[i] !== keysB[i]) return false;
                        if ((a || {})[keysA[i]] !== (b || {})[keysB[i]]) return false;
                    }
                    return true;
                };

                // Check if item with same productId and configuration already exists
                const existingItemIndex = items.findIndex((item) => {
                    if (item.productId !== newItem.productId) return false;

                    // Compare configurations properly ignoring key order
                    return isConfigEqual(item.configuration, newItem.configuration);
                });

                if (existingItemIndex !== -1) {
                    // Item exists - increment quantity
                    set((state) => ({
                        items: state.items.map((item, index) =>
                            index === existingItemIndex
                                ? { ...item, quantity: item.quantity + newItem.quantity }
                                : item
                        )
                    }));
                } else {
                    // Item doesn't exist - add new entry
                    const id = Math.random().toString(36).substring(2, 9);
                    set((state) => ({
                        items: [...state.items, { ...newItem, id }]
                    }));
                }
            },

            removeItem: (itemId) => {
                set((state) => ({
                    items: state.items.filter((i) => i.id !== itemId)
                }));
            },

            updateQuantity: (itemId, quantity) => {
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === itemId
                            ? { ...item, quantity: Math.max(1, quantity) }
                            : item
                    )
                }));
            },

            clearCart: () => {
                set({ items: [] });
            },

            getTotalPrice: () => {
                return get().items.reduce(
                    (total, item) => total + (item.price * item.quantity),
                    0
                );
            },

            getTotalItems: () => {
                return get().items.reduce(
                    (total, item) => total + item.quantity,
                    0
                );
            },

            // --- Promotional Logic ---

            getFreeShippingThreshold: () => {
                const subtotal = get().getTotalPrice();
                const threshold = get()._shippingFreeThreshold;
                return Math.max(0, threshold - subtotal);
            },

            isFreeShippingEligible: () => {
                const threshold = get()._shippingFreeThreshold;
                return get().getTotalPrice() >= threshold;
            },

            getGiftThreshold: () => {
                const totalItems = get().getTotalItems();
                const remainder = totalItems % 11;
                return remainder === 0 && totalItems > 0 ? 0 : 11 - remainder;
            },

            getDiscount: () => {
                const items = get().items;
                const totalItems = get().getTotalItems();

                // Gift Logic: 1 free for every 11 items
                const freeItemCount = Math.floor(totalItems / 11);

                if (freeItemCount === 0) return 0;

                // Flatten items into a list of individual units with their prices and original index
                // We need original index to break ties (last added gets discount)
                // Since items array order represents addition order (roughly), we use that.
                const individualUnits: { price: number; originalIndex: number }[] = [];

                items.forEach((item, index) => {
                    for (let i = 0; i < item.quantity; i++) {
                        individualUnits.push({
                            price: item.price,
                            originalIndex: index
                        });
                    }
                });

                // Sort by price (ASC) first, then by originalIndex (DESC) for tie-breaking
                // "The discount must strictly apply to the item with the lowest price."
                // "If multiple items share the lowest price... apply the discount to the last added item"
                individualUnits.sort((a, b) => {
                    if (a.price !== b.price) {
                        return a.price - b.price; // Lowest price first
                    }
                    return b.originalIndex - a.originalIndex; // Last added first (higher index)
                });

                // Sum the prices of the top 'freeItemCount' items
                let discount = 0;
                for (let i = 0; i < freeItemCount; i++) {
                    discount += individualUnits[i].price;
                }

                return discount;
            },

            getShippingCost: () => {
                const price = get()._shippingPrice;
                return get().isFreeShippingEligible() ? 0 : price;
            },

            getFinalPrice: () => {
                const subtotal = get().getTotalPrice();
                const discount = get().getDiscount();
                const shipping = get().getShippingCost();
                return Math.max(0, subtotal - discount + shipping);
            },

            setShippingConfig: (price: number, freeThreshold: number) => {
                set({ _shippingPrice: price, _shippingFreeThreshold: freeThreshold });
            }
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
        }
    )
);
