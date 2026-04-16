'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/types/product';

interface ImageLightboxProps {
    images: any[];
    initialIndex: number;
    onClose: () => void;
    getAlt: (img: any, idx: number) => string;
}

export default function ImageLightbox({ images, initialIndex, onClose, getAlt }: ImageLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const goNext = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
    }, [images.length]);

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    // Lock body scroll
    useEffect(() => {
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose, goNext, goPrev]);

    // Touch swipe support
    useEffect(() => {
        let startX = 0;
        const handleStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
        const handleEnd = (e: TouchEvent) => {
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) goNext();
                else goPrev();
            }
        };
        document.addEventListener('touchstart', handleStart, { passive: true });
        document.addEventListener('touchend', handleEnd, { passive: true });
        return () => {
            document.removeEventListener('touchstart', handleStart);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [goNext, goPrev]);

    if (!images[currentIndex]) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close lightbox"
            >
                <X size={24} />
            </button>

            {/* Counter */}
            {images.length > 1 && (
                <div className="absolute top-4 left-4 z-10 text-white/60 text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
                    {currentIndex + 1} / {images.length}
                </div>
            )}

            {/* Navigation arrows */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                        className="absolute left-2 sm:left-6 z-10 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Previous image"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                        className="absolute right-2 sm:right-6 z-10 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Next image"
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Main image */}
            <div
                className="relative w-[90vw] h-[80vh] max-w-5xl"
                onClick={(e) => e.stopPropagation()}
            >
                <Image
                    src={getImageUrl(images[currentIndex])}
                    alt={getAlt(images[currentIndex], currentIndex)}
                    fill
                    className="object-contain select-none"
                    sizes="90vw"
                    priority
                    draggable={false}
                />
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                            className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex
                                ? 'bg-[#C9A227] scale-125'
                                : 'bg-white/30 hover:bg-white/60'
                                }`}
                            aria-label={`Image ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
