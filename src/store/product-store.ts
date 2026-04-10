import { getAllProducts } from '@/actions/admin-actions';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product } from '@/types/product';


interface ProductState {
    products: Product[];
    lastFetched: number;
    isLoading: boolean;
    error: string | null;
    hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    fetchProducts: (force?: boolean) => Promise<void>;
}

// 5 minutes cache duration
const CACHE_DURATION = 5 * 60 * 1000;

export const useProductStore = create<ProductState>()(
    persist(
        (set, get) => ({
            products: [],
            lastFetched: 0,
            isLoading: false,
            error: null,
            hasHydrated: false,
            setHasHydrated: (state) => set({ hasHydrated: state }),

            fetchProducts: async (force = false) => {
                const { products, lastFetched, isLoading } = get();
                const now = Date.now();

                // Return immediately if already loading
                if (isLoading) return;

                // Return immediately if valid cache exists and not forced
                if (!force && products.length > 0 && (now - lastFetched < CACHE_DURATION)) {
                    return;
                }

                set({ isLoading: true, error: null });

                try {
                    const fetchedProducts = await getAllProducts() as Product[];
                    set({
                        products: fetchedProducts,
                        lastFetched: now,
                        isLoading: false
                    });
                } catch (error) {
                    console.error('Error fetching products:', error);
                    set({
                        error: 'Failed to fetch products',
                        isLoading: false
                    });
                }
            }
        }),
        {
            name: 'product-storage',
            storage: createJSONStorage(() => sessionStorage), // Use sessionStorage to persist for the session
            partialize: (state) => ({
                products: state.products,
                lastFetched: state.lastFetched
            }), // Only persist data, not loading state
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
