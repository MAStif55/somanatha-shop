'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useCartUIStore } from '@/store/cart-ui-store';

function PromoHandlerInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { applyPromoCode, getTotalPrice, appliedPromo } = useCartStore();
    const { setPromoBubbleVisible } = useCartUIStore();

    useEffect(() => {
        const promoCode = searchParams.get('promo');
        
        if (promoCode) {
            // Remove promo from URL to clean it up
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            // If already applied, just show the bubble
            if (appliedPromo && appliedPromo.code === promoCode) {
                setPromoBubbleVisible(true);
                return;
            }

            // Fetch and apply promo
            const applyPromo = async () => {
                try {
                    const res = await fetch('/api/checkout/apply-promo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: promoCode, cartTotal: getTotalPrice() || 0 })
                    });
                    const data = await res.json();
                    if (res.ok && data.promo) {
                        applyPromoCode(data.promo);
                        setPromoBubbleVisible(true);
                    } else {
                        console.error('Failed to apply promo from URL:', data.error);
                    }
                } catch (err) {
                    console.error('Error applying promo from URL:', err);
                }
            };

            applyPromo();
        }
    }, [searchParams, applyPromoCode, getTotalPrice, appliedPromo, setPromoBubbleVisible, router]);

    return null;
}

export default function PromoUrlHandler() {
    return (
        <Suspense fallback={null}>
            <PromoHandlerInner />
        </Suspense>
    );
}
