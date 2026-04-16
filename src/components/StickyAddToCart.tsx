'use client';

import { useState, useEffect, RefObject } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/utils/currency';

interface StickyAddToCartProps {
    productTitle: string;
    productImage: string;
    totalPrice: number;
    onAddToCart: () => void;
    targetRef: RefObject<HTMLButtonElement | null>;
    addedToCart: boolean;
}

export default function StickyAddToCart({
    productTitle,
    productImage,
    totalPrice,
    onAddToCart,
    targetRef,
    addedToCart,
}: StickyAddToCartProps) {
    const { locale } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const target = targetRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Show sticky bar when the original button is NOT visible
                setIsVisible(!entry.isIntersecting);
            },
            { threshold: 0 }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [targetRef]);

    if (!isVisible) return null;

    return (
        <>
            {/* Mobile: bottom fixed bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[80] transform transition-transform duration-300 ease-out"
                style={{ transform: isVisible ? 'translateY(0)' : 'translateY(100%)' }}
            >
                <div className="bg-[#0D0A0B]/90 backdrop-blur-xl border-t border-[#C9A227]/30 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
                    {productImage && (
                        <img
                            src={productImage}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-[#C9A227]/20 flex-shrink-0"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#E8D48B] truncate">{productTitle}</p>
                        <p className="text-sm font-bold text-[#C9A227]">{formatPrice(totalPrice)}</p>
                    </div>
                    <button
                        onClick={onAddToCart}
                        disabled={addedToCart}
                        className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 flex-shrink-0 transition-all ${addedToCart
                            ? 'bg-green-600 text-white'
                            : 'bg-gradient-to-r from-[#C9A227] to-[#8B6914] text-[#0D0A0B] hover:shadow-[0_0_15px_rgba(201,162,39,0.4)]'
                            }`}
                    >
                        <ShoppingCart size={16} />
                        {addedToCart
                            ? (locale === 'ru' ? '✓' : '✓')
                            : (locale === 'ru' ? 'В корзину' : 'Add')
                        }
                    </button>
                </div>
            </div>

            {/* Desktop: top sticky bar */}
            <div className="hidden md:block fixed top-0 left-0 right-0 z-[80] transform transition-all duration-300 ease-out"
                style={{
                    transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
                    opacity: isVisible ? 1 : 0,
                }}
            >
                <div className="bg-[#0D0A0B]/85 backdrop-blur-xl border-b border-[#C9A227]/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                    <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
                        {productImage && (
                            <img
                                src={productImage}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-[#C9A227]/20 flex-shrink-0"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#E8D48B] truncate">{productTitle}</p>
                        </div>
                        <p className="text-lg font-bold text-[#C9A227] flex-shrink-0">{formatPrice(totalPrice)}</p>
                        <button
                            onClick={onAddToCart}
                            disabled={addedToCart}
                            className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 flex-shrink-0 transition-all ${addedToCart
                                ? 'bg-green-600 text-white'
                                : 'bg-gradient-to-r from-[#C9A227] to-[#8B6914] text-[#0D0A0B] hover:shadow-[0_0_20px_rgba(201,162,39,0.4)]'
                                }`}
                        >
                            <ShoppingCart size={16} />
                            {addedToCart
                                ? (locale === 'ru' ? 'Добавлено!' : 'Added!')
                                : (locale === 'ru' ? 'В корзину' : 'Add to Cart')
                            }
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
