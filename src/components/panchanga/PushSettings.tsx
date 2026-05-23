'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import PushSettingsModal from './PushSettingsModal';

interface PushSettingsProps {
    latitude: number;
    longitude: number;
    cityName: string;
}

export default function PushSettings({ latitude, longitude, cityName }: PushSettingsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // SSR-safe check for service workers and push support
        const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        setIsSupported(pushSupported);

        if (!pushSupported) return;

        // Register Service Worker if supported
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => {
                console.log('[ServiceWorker] Registered successfully with scope:', reg.scope);
                
                // Check if already subscribed to push manager
                return reg.pushManager.getSubscription();
            })
            .then((subscription) => {
                setIsSubscribed(!!subscription);
                if (!subscription) {
                    setTimeout(() => setShowTooltip(true), 3000);
                }
            })
            .catch((err) => {
                console.error('[ServiceWorker] Registration failed:', err);
            });
    }, []);

    // Sync state when modal is closed (in case they subscribe/unsubscribe)
    const handleClose = () => {
        setIsOpen(false);
        if (isSupported) {
            navigator.serviceWorker.ready.then(async (registration) => {
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            });
        }
    };

    if (!isSupported) return null;

    return (
        <>
            <div className="relative flex items-center">
                {showTooltip && !isSubscribed && !isOpen && (
                    <div className="absolute bottom-full mb-3 right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-500 z-50">
                        <div className="bg-[#1A1517]/95 backdrop-blur-xl border border-[#C9A227]/40 rounded-2xl p-4 shadow-[0_10px_40px_rgba(201,162,39,0.15)] relative">
                            <div className="absolute -bottom-2 right-8 md:right-auto md:left-1/2 md:-translate-x-1/2 w-4 h-4 bg-[#1A1517] border-b border-r border-[#C9A227]/40 rotate-45"></div>
                            <div className="flex items-start gap-3 relative z-10">
                                <div className="w-8 h-8 rounded-full bg-[#C9A227]/10 flex flex-shrink-0 items-center justify-center border border-[#C9A227]/20">
                                    <Bell className="w-4 h-4 text-[#C9A227] animate-pulse" />
                                </div>
                                <div className="pr-2">
                                    <p className="text-xs font-semibold text-[#E8D48B] mb-1">Не пропустите события!</p>
                                    <p className="text-[10px] text-[#F5ECD7]/80 leading-relaxed">Включите уведомления, чтобы вовремя узнавать о наступлении Экадаши и смене Титхи.</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }} className="absolute -top-1 -right-1 text-[#C9A227]/50 hover:text-[#C9A227] p-1 bg-black/20 rounded-full hover:bg-black/40 transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => { setIsOpen(true); setShowTooltip(false); }}
                    className={`flex items-center gap-3 bg-[#1A1517]/80 backdrop-blur-md border px-5 py-2.5 rounded-2xl transition-all duration-300 group ${
                        isSubscribed
                            ? 'border-[#C9A227]/40 hover:bg-[#C9A227]/10 hover:border-[#C9A227] shadow-[0_0_15px_rgba(201,162,39,0.1)]'
                            : 'border-[#C9A227]/20 hover:bg-[#C9A227]/10 hover:border-[#C9A227]/60'
                    }`}
                    title="Настроить уведомления"
                >
                    {isSubscribed ? (
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/30 group-hover:scale-105 transition-transform duration-300">
                            <Bell className="w-4 h-4 text-[#C9A227]" />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 group-hover:border-[#C9A227]/30 group-hover:bg-[#C9A227]/5 transition-all duration-300">
                            <BellOff className="w-4 h-4 text-[#C9A227]/50 group-hover:text-[#C9A227]/80 transition-colors" />
                        </div>
                    )}
                    <div className="flex flex-col items-start text-left">
                        <span className={`text-sm font-semibold tracking-wide leading-tight ${isSubscribed ? 'text-[#E8D48B]' : 'text-[#F5ECD7] group-hover:text-[#E8D48B] transition-colors'}`}>
                            {isSubscribed ? 'Уведомления ВКЛ' : 'Включить пуши'}
                        </span>
                        <span className="text-[10px] text-[#C9A227]/60 uppercase tracking-wider font-medium leading-tight mt-0.5">
                            {isSubscribed ? 'Настроить фильтры' : 'Узнавать о событиях'}
                        </span>
                    </div>
                </button>
            </div>

            <PushSettingsModal
                isOpen={isOpen}
                onClose={handleClose}
                latitude={latitude}
                longitude={longitude}
                cityName={cityName}
            />
        </>
    );
}
