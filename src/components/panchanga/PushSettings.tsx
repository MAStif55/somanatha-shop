'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
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
            <button
                onClick={() => setIsOpen(true)}
                className={`flex items-center gap-2 bg-[#1A1517]/80 backdrop-blur-md border px-4 py-2 rounded-full transition-all group ${
                    isSubscribed
                        ? 'border-[#C9A227]/40 hover:bg-[#C9A227]/10 hover:border-[#C9A227]'
                        : 'border-[#C9A227]/20 hover:bg-[#C9A227]/5 hover:border-[#C9A227]/40'
                }`}
                title="Настроить уведомления"
            >
                {isSubscribed ? (
                    <Bell className="w-4 h-4 text-[#C9A227] animate-pulse" />
                ) : (
                    <BellOff className="w-4 h-4 text-[#C9A227]/60 group-hover:text-[#C9A227] transition-colors" />
                )}
                <span className="text-[#F5ECD7] font-medium text-sm">
                    {isSubscribed ? 'Уведомления ВКЛ' : 'Уведомления'}
                </span>
            </button>

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
