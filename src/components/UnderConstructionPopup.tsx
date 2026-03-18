'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, MessageCircle } from 'lucide-react';

const STORAGE_KEY = 'under-construction-dismissed';
const ANIM_MS = 450;

/* FAB CSS position: fixed bottom-6 left-6  w-14 h-14
   → 1.5rem = 24px offset, 3.5rem = 56px size
   → center = (24 + 28, viewportH - 24 - 28) = (52, vh - 52)           */
function getFabCenter() {
    return { x: 52, y: window.innerHeight - 52 };
}

type Phase = 'hidden' | 'opening' | 'open' | 'closing' | 'fab';

export default function UnderConstructionPopup() {
    const { locale } = useLanguage();
    const [phase, setPhase] = useState<Phase>('hidden');
    const [mounted, setMounted] = useState(false);

    const modalRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const fabRef = useRef<HTMLButtonElement>(null);
    const entrancePlayed = useRef(false);

    /* ── Initialise on client only ── */
    useEffect(() => {
        const wasDismissed = localStorage.getItem(STORAGE_KEY);
        if (wasDismissed) {
            setPhase('fab');
            entrancePlayed.current = true; // no entrance needed
        } else {
            setPhase('open');
        }
        setMounted(true);
    }, []);

    /* ── Entrance animation for first-visit open ── */
    useEffect(() => {
        if (!mounted || phase !== 'open' || entrancePlayed.current) return;
        entrancePlayed.current = true;

        const modal = modalRef.current;
        const overlay = overlayRef.current;
        if (!modal || !overlay) return;

        overlay.animate([{ opacity: '0' }, { opacity: '1' }], {
            duration: 350,
            easing: 'ease-out',
            fill: 'forwards',
        });
        modal.animate(
            [
                { transform: 'scale(0.9) translateY(20px)', opacity: '0' },
                { transform: 'scale(1) translateY(0)', opacity: '1' },
            ],
            { duration: 350, easing: 'cubic-bezier(0.15, 0.65, 0.45, 1)', fill: 'forwards' },
        );
    }, [mounted, phase]);

    /* ── Close: fly modal → FAB corner ── */
    const dismiss = useCallback(() => {
        if (phase !== 'open') return;
        setPhase('closing');
        localStorage.setItem(STORAGE_KEY, '1');

        const modal = modalRef.current;
        const overlay = overlayRef.current;
        if (!modal || !overlay) { setPhase('fab'); return; }

        const mRect = modal.getBoundingClientRect();
        const modalCX = mRect.left + mRect.width / 2;
        const modalCY = mRect.top + mRect.height / 2;
        const fab = getFabCenter();
        const dx = fab.x - modalCX;
        const dy = fab.y - modalCY;

        modal.animate(
            [
                { transform: 'translate(0, 0) scale(1)', opacity: '1', borderRadius: '1rem' },
                { transform: `translate(${dx}px, ${dy}px) scale(0.05)`, opacity: '0', borderRadius: '50%' },
            ],
            { duration: ANIM_MS, easing: 'cubic-bezier(0.55, 0, 0.85, 0.35)', fill: 'forwards' },
        );

        overlay.animate([{ opacity: '1' }, { opacity: '0' }], {
            duration: ANIM_MS * 0.6,
            easing: 'ease-out',
            fill: 'forwards',
        });

        setTimeout(() => setPhase('fab'), ANIM_MS);
    }, [phase]);

    /* ── Re-open: expand from FAB corner ── */
    const reopen = useCallback(() => {
        if (phase !== 'fab') return;
        setPhase('opening');

        requestAnimationFrame(() => requestAnimationFrame(() => {
            const modal = modalRef.current;
            const overlay = overlayRef.current;
            const fabEl = fabRef.current;
            if (!modal || !overlay) { setPhase('open'); return; }

            let dx = 0, dy = 0;
            if (fabEl) {
                const fabRect = fabEl.getBoundingClientRect();
                const fabCX = fabRect.left + fabRect.width / 2;
                const fabCY = fabRect.top + fabRect.height / 2;
                const mRect = modal.getBoundingClientRect();
                const modalCX = mRect.left + mRect.width / 2;
                const modalCY = mRect.top + mRect.height / 2;
                dx = fabCX - modalCX;
                dy = fabCY - modalCY;
            }

            modal.animate(
                [
                    { transform: `translate(${dx}px, ${dy}px) scale(0.05)`, opacity: '0', borderRadius: '50%' },
                    { transform: 'translate(0, 0) scale(1)', opacity: '1', borderRadius: '1rem' },
                ],
                { duration: ANIM_MS, easing: 'cubic-bezier(0.15, 0.65, 0.45, 1)', fill: 'forwards' },
            );

            overlay.animate([{ opacity: '0' }, { opacity: '1' }], {
                duration: ANIM_MS * 0.7,
                easing: 'ease-out',
                fill: 'forwards',
            });

            setTimeout(() => setPhase('open'), ANIM_MS);
        }));
    }, [phase]);

    // Determine if entrance animation hasn't played yet (first open render)
    const needsEntrance = phase === 'open' && !entrancePlayed.current;
    const showModal = phase === 'opening' || phase === 'open' || phase === 'closing';

    // Don't render anything until client-side localStorage check is done
    if (!mounted) return null;

    return (
        <>
            {/* ─── Modal ─── */}
            {showModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={dismiss}
                >
                    <div
                        ref={overlayRef}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        style={(phase === 'opening' || needsEntrance) ? { opacity: 0 } : undefined}
                    />

                    <div
                        ref={modalRef}
                        className="relative w-full max-w-lg rounded-2xl border border-[#C9A227]/30 bg-[#1A1517] shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        style={(phase === 'opening' || needsEntrance) ? { opacity: 0, transform: 'scale(0.9) translateY(20px)' } : undefined}
                    >
                        <div className="h-1 bg-gradient-to-r from-[#C9A227]/0 via-[#C9A227] to-[#C9A227]/0" />

                        <button
                            onClick={dismiss}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-[#F5ECD7]/50 hover:text-[#E8D48B] hover:bg-[#C9A227]/10 transition-all"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>

                        <div className="px-6 pt-8 pb-6 sm:px-8">
                            <div className="text-center mb-5">
                                <span className="text-4xl">🛠️</span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-ornamental text-[#E8D48B] text-center mb-4">
                                {locale === 'ru' ? 'Дорогие друзья!' : 'Dear friends!'}
                            </h2>

                            <p className="text-[#F5ECD7]/80 text-sm sm:text-base leading-relaxed text-center mb-8">
                                {locale === 'ru'
                                    ? 'Наш сайт уже работает, но мы всё ещё продолжаем наполнять каталог самыми интересными новинками. Если вы не нашли то, что искали — пожалуйста, не стесняйтесь писать нам напрямую. Мы всегда на связи и с радостью поможем вам с выбором!'
                                    : "Our website is live, but we are still in the process of adding new items to our catalog. If you can't find exactly what you're looking for, please don't hesitate to message us directly. We're always here and happy to help you find the perfect match!"}
                            </p>

                            <div className="flex flex-col gap-3 mb-6">
                                <a
                                    href="https://t.me/Trubitsina_Elena_Astrolog"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-4 rounded-xl border border-[#C9A227]/30 bg-[#1A1517]/80 hover:border-[#C9A227]/60 hover:bg-[#1A1517] transition-all group"
                                >
                                    <div className="w-11 h-11 bg-[#229ED9]/15 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#229ED9]" fill="currentColor">
                                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-[#E8D48B] group-hover:text-[#C9A227] transition-colors">Telegram</h4>
                                        <p className="text-[#F5ECD7]/60 text-sm truncate">
                                            {locale === 'ru' ? 'Напишите нам в Telegram' : 'Message us on Telegram'}
                                        </p>
                                    </div>
                                    <svg className="w-5 h-5 text-[#C9A227]/50 flex-shrink-0 group-hover:text-[#C9A227] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </a>

                                <a
                                    href="https://max.ru/u/f9LHodD0cOIistNNtQFWq4OLPx_ZPYrqvTyLMwLrRY0P9hHA7Zd06uRLwCg"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-4 rounded-xl border border-[#C9A227]/30 bg-[#1A1517]/80 hover:border-[#C9A227]/60 hover:bg-[#1A1517] transition-all group"
                                >
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        <Image
                                            src="/messenger-max.svg"
                                            alt="Messenger Max"
                                            width={44}
                                            height={44}
                                            className="w-full h-full"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-[#E8D48B] group-hover:text-[#C9A227] transition-colors">Max</h4>
                                        <p className="text-[#F5ECD7]/60 text-sm truncate">
                                            {locale === 'ru' ? 'Напишите нам в Max' : 'Message us on Max'}
                                        </p>
                                    </div>
                                    <svg className="w-5 h-5 text-[#C9A227]/50 flex-shrink-0 group-hover:text-[#C9A227] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </a>
                            </div>

                            <button
                                onClick={dismiss}
                                className="w-full py-3 rounded-lg border border-[#C9A227]/30 text-[#E8D48B] hover:bg-[#C9A227]/10 hover:border-[#C9A227]/50 transition-all font-medium"
                            >
                                {locale === 'ru' ? 'Закрыть' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Floating Action Button ─── */}
            {(phase === 'fab' || phase === 'opening') && (
                <button
                    ref={fabRef}
                    onClick={phase === 'fab' ? reopen : undefined}
                    title={locale === 'ru' ? 'Связаться с нами' : 'Contact us'}
                    className="fixed bottom-6 left-6 z-[90] w-14 h-14 rounded-full bg-gradient-to-br from-[#1A1517] to-[#0D0A0B] border border-[#C9A227]/40 shadow-lg shadow-black/30 flex items-center justify-center text-[#E8D48B] hover:border-[#C9A227] hover:text-[#C9A227] hover:shadow-[#C9A227]/20 hover:scale-110 active:scale-95 transition-all duration-200 group"
                    style={
                        phase === 'fab'
                            ? { animation: 'fab-pop-in 300ms ease-out both' }
                            : { opacity: 0, pointerEvents: 'none' as const }
                    }
                    aria-label={locale === 'ru' ? 'Связаться с нами' : 'Contact us'}
                >
                    <MessageCircle size={24} className="group-hover:rotate-[-8deg] transition-transform" />
                </button>
            )}
        </>
    );
}
