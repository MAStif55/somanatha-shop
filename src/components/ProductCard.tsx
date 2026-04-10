'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Product, getImageUrl, getCardImageUrl, getThumbImageUrl, getImageAlt, getVideoPreviewUrl } from '@/types/product';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShoppingCart, Play } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import { useCartStore } from '@/store/cart-store';
import { useToastStore } from '@/store/toast-store';
import { useLiveVideoContext } from '@/contexts/LiveVideoContext';
import Image from 'next/image';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { locale, t } = useLanguage();
    const { addItem } = useCartStore();
    const { addToast } = useToastStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [isVideoBuffering, setIsVideoBuffering] = useState(false);

    // Live Video Context for Hero Auto-Play
    const { activeHeroId, registerCard, unregisterCard } = useLiveVideoContext();

    useEffect(() => {
        if (product.videoPreviewUrl && imageContainerRef.current) {
            registerCard(product.id, imageContainerRef.current);
            return () => unregisterCard(product.id);
        }
    }, [product.id, product.videoPreviewUrl, registerCard, unregisterCard]);

    useEffect(() => {
        if (!videoRef.current) return;

        const isHero = activeHeroId === product.id;
        const shouldPlay = isHero || isHovered;

        if (shouldPlay) {
            videoRef.current.play().catch(() => { });
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }, [activeHeroId, isHovered, product.id]);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent navigation

        addItem({
            productId: product.id,
            productTitle: product.title,
            productImage: product.images?.[0] ? getThumbImageUrl(product.images[0]) : '',
            price: product.basePrice,
            quantity: 1,
            configuration: {}
        });

        // Show toast notification
        addToast({
            message: locale === 'ru'
                ? `${product.title[locale]} добавлен в корзину`
                : `${product.title[locale]} added to cart`,
            type: 'success',
            duration: 3000,
        });
    };

    // Fallback to product ID if slug is missing
    const productSlug = product.slug || product.id;

    return (
        <Link
            href={`/product/${productSlug}`}
            className="group bg-[#1A1517] rounded-xl shadow-lg hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 border border-[#C9A227]/20 hover:border-[#C9A227]/60 flex flex-col h-full overflow-hidden relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Gold accent line at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8B6914] via-[#C9A227] to-[#8B6914] opacity-60 group-hover:opacity-100 transition-opacity" />

            {/* Image Container */}
            <div
                ref={imageContainerRef}
                className="relative aspect-square overflow-hidden bg-[#0D0A0B] product-image-container"
                onContextMenu={(e) => e.preventDefault()}
            >
                {product.images && product.images.length > 0 ? (
                    <img
                        src={getCardImageUrl(product.images[0])}
                        alt={getImageAlt(product.images[0], locale as 'en' | 'ru', product.title[locale])}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-[#0D0A0B] text-[#C9A227]/30">
                        🕉️
                    </div>
                )}

                {/* Video Preview Layer - Now acts like a continuous Live Photo/GIF */}
                {product.videoPreviewUrl && (
                    <video
                        ref={videoRef}
                        src={getVideoPreviewUrl(product.videoPreviewUrl)}
                        className={`absolute inset-0 w-full h-full object-cover z-20 pointer-events-none transition-opacity duration-300 ${isPlaying && isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                        muted
                        playsInline
                        loop
                        preload="metadata"
                        onLoadedData={() => setIsVideoLoaded(true)}
                        onWaiting={() => setIsVideoBuffering(true)}
                        onPlaying={() => {
                            setIsVideoBuffering(false);
                            setIsVideoLoaded(true);
                        }}
                    />
                )}

                {/* Video Icon Badge */}
                {product.videoPreviewUrl && (
                    <div
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // If they manually click the icon, toggle hovered logic or hero state?
                            // For a hover/hero based auto-play, manually clicking will reverse it until next intersection change.
                            setIsHovered(!isHovered);
                        }}
                        className="absolute top-3 right-3 z-30 bg-black/60 text-[#C9A227] w-8 h-8 rounded-full border border-[#C9A227]/30 flex items-center justify-center backdrop-blur-md shadow-[0_0_10px_rgba(0,0,0,0.5)] group-hover:scale-110 group-hover:bg-[#C9A227]/20 transition-all duration-300 cursor-pointer"
                    >
                        {isPlaying && (!isVideoLoaded || isVideoBuffering) && (
                            <svg className="animate-spin absolute inset-0 w-full h-full text-[#C9A227]" style={{ padding: '2px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        <Play size={14} fill="currentColor" className="ml-0.5" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg sm:text-lg lg:text-xl font-bold text-[#E8D48B] mb-2 group-hover:text-glow-gold transition-all font-elegant text-center line-clamp-3 min-h-[3rem] lg:min-h-[3.5rem] flex items-center justify-center">
                    {product.title[locale]}
                </h3>

                <div className="text-[13px] sm:text-sm text-[#F5ECD7]/70 mb-4 flex-1 font-medium text-center leading-snug sm:leading-relaxed h-auto">
                    <div className="[&>p]:mb-2 last:[&>p]:mb-0">
                        <ReactMarkdown>
                            {product.shortDescription?.[locale] || product.description[locale].replace(/<[^>]*>/g, '')}
                        </ReactMarkdown>
                    </div>
                </div>

                <div className="flex flex-col mt-auto pt-4 border-t border-[#C9A227]/20">
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3 w-full">
                        <div className="w-full sm:flex-1 flex items-center justify-center h-10 sm:h-11 px-2 rounded-lg border border-[#C9A227]/40 text-[#C9A227] font-semibold font-elegant text-[11px] sm:text-xs lg:text-[13px] uppercase tracking-[0.05em] hover:bg-[#C9A227]/10 hover:border-[#C9A227] transition-all duration-200 text-center">
                            {locale === 'ru' ? 'Полное описание' : 'Details'}
                        </div>
                        <button
                            onClick={handleAddToCart}
                            className="w-full sm:flex-1 flex items-center justify-center gap-2 h-10 sm:h-11 px-2 rounded-lg bg-gradient-to-r from-[#C9A227] to-[#8B6914] text-[#0D0A0B] font-semibold font-elegant text-[11px] sm:text-xs lg:text-[13px] uppercase tracking-[0.05em] hover:shadow-[0_0_20px_rgba(201,162,39,0.5)] hover:scale-105 transition-all duration-200 border border-[#C9A227]"
                            title={t('product.addToCart')}
                        >
                            <ShoppingCart size={14} className="w-[14px] h-[14px] sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px] shrink-0" />
                            <span className="truncate">{locale === 'ru' ? 'В корзину' : 'Add'}</span>
                        </button>
                    </div>
                    <div className="text-center w-full mt-4 sm:mt-5">
                        <span className="text-lg sm:text-xl font-bold text-[#C9A227]">
                            {formatPrice(product.basePrice)}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
