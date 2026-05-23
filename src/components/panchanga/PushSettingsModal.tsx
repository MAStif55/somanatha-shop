'use client';

import React, { useState, useEffect } from 'react';
import { X, Bell, BellOff, Info, Check, Share, ArrowUp, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import LocationSelector from './LocationSelector';

interface PushSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    latitude: number;
    longitude: number;
    cityName: string;
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushSettingsModal({ isOpen, onClose, latitude, longitude, cityName }: PushSettingsModalProps) {
    const [isSupported, setIsSupported] = useState(true);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);

    // Form settings
    const [preferences, setPreferences] = useState({
        tithi: true,
        nakshatra: true,
        muhurta: true,
        promotions: true,
        frequency: 'instant' as 'instant' | 'daily',
        quietHours: true
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 1. Check browser support
        const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        setIsSupported(pushSupported);

        if (!pushSupported) return;

        // 2. Check current notification permission
        setPermissionStatus(Notification.permission);

        // 3. Detect iOS and Standalone PWA mode
        const ua = window.navigator.userAgent.toLowerCase();
        const iosDetected = /iphone|ipad|ipod/.test(ua);
        setIsIOS(iosDetected);

        const iosStandalone = (window.navigator as any).standalone === true;
        const displayStandalone = window.matchMedia('(display-mode: standalone)').matches;
        setIsStandalone(iosStandalone || displayStandalone);

        // 4. Check if currently subscribed in browser and sync preferences
        navigator.serviceWorker.ready.then(async (registration) => {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                setIsSubscribed(true);
                // Try sync from server
                try {
                    const res = await fetch('/api/push/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint: subscription.endpoint })
                    });
                    const data = await res.json();
                    if (data.success && data.exists) {
                        setPreferences(data.preferences);
                    } else {
                        // Local storage fallback
                        const saved = localStorage.getItem('push_preferences');
                        if (saved) setPreferences(JSON.parse(saved));
                    }
                } catch (e) {
                    console.error('Error syncing subscription:', e);
                }
            } else {
                setIsSubscribed(false);
            }
        });
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCheckboxChange = (key: keyof typeof preferences) => {
        if (key === 'frequency' || key === 'quietHours') return; // handled separately
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleFrequencyChange = (value: 'instant' | 'daily') => {
        setPreferences(prev => ({
            ...prev,
            frequency: value
        }));
    };

    const toggleQuietHours = () => {
        setPreferences(prev => ({
            ...prev,
            quietHours: !prev.quietHours
        }));
    };

    const detectPlatform = (): 'ios' | 'android' | 'desktop' => {
        if (typeof window === 'undefined') return 'desktop';
        const ua = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) return 'ios';
        if (/android/.test(ua)) return 'android';
        return 'desktop';
    };

    const handleSubscribe = async () => {
        if (!isSupported) return;
        setIsSubmitting(true);
        setErrorDetails(null);

        try {
            // Register or wait for active service worker
            const registration = await navigator.serviceWorker.ready;

            // Generate subscription
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                throw new Error('VAPID public key is missing');
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            // Extract timezone
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow';

            // Send subscription and preferences to server
            const payload = {
                subscription,
                preferences,
                timezone,
                platform: detectPlatform(),
                location: {
                    lat: latitude,
                    lon: longitude,
                    cityName: cityName
                }
            };

            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.success) {
                setIsSubscribed(true);
                setPermissionStatus(Notification.permission);
                localStorage.setItem('push_preferences', JSON.stringify(preferences));
            } else {
                setErrorDetails(`Ошибка на стороне сервера: ${data.error || 'Неизвестная ошибка'}`);
            }
        } catch (error: any) {
            console.error('Push subscription failed:', error);
            const errStr = error?.message || String(error);
            let userFriendlyMsg = 'Не удалось оформить подписку. Убедитесь, что вы разрешили уведомления в системе.';

            if (errStr.includes('permission denied') || errStr.includes('Permission denied')) {
                userFriendlyMsg = 'Доступ к уведомлениям отклонен. Возможно, вы открыли сайт через встроенный просмотрщик (Яндекс Старт, Telegram, VK, встроенный браузер почты), где пуши не поддерживаются, либо заблокировали уведомления в настройках.\n\nРешение: Откройте сайт в полноценном браузере (Chrome, Safari, Яндекс.Браузер) и разрешите уведомления в его настройках.';
            } else if (errStr.includes('VAPID')) {
                userFriendlyMsg = 'На сервере не настроены VAPID ключи шифрования для пушей.';
            }

            setErrorDetails(userFriendlyMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnsubscribe = async () => {
        if (!isSupported) return;
        setIsSubmitting(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Delete subscription from server
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                });

                // Unsubscribe in browser
                await subscription.unsubscribe();
            }

            setIsSubscribed(false);
            localStorage.removeItem('push_preferences');
            alert('Вы успешно отписались от уведомлений.');
            onClose();
        } catch (error) {
            console.error('Error unsubscribing:', error);
            alert('Произошла ошибка при отмене подписки.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-[#0D0A0B] border border-[#C9A227]/30 rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-[#C9A227]/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-[#C9A227]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-ornamental text-[#E8D48B] tracking-wide">Настройка уведомлений</h2>
                            <p className="text-xs text-[#C9A227]/60">Календарь и актуальные транзиты</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#F5ECD7]/60 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar text-[#F5ECD7]">
                    
                    {/* Error Details Alert */}
                    {errorDetails && (
                        <div className="p-4 bg-red-950/40 border border-red-500/20 rounded-xl text-xs text-red-200/90 leading-relaxed space-y-1">
                            <div className="font-semibold text-red-400 flex items-center gap-1.5">
                                <BellOff className="w-3.5 h-3.5 text-red-400" />
                                <span>Подписка не удалась</span>
                            </div>
                            <p className="whitespace-pre-line">{errorDetails}</p>
                        </div>
                    )}
                    
                    {/* iOS Specific Instructions if not Standalone */}
                    {isIOS && !isStandalone && (
                        <div className="bg-[#C9A227]/5 border border-[#C9A227]/20 p-5 rounded-2xl space-y-4">
                            <div className="flex gap-3">
                                <Share className="w-6 h-6 text-[#C9A227] shrink-0 animate-bounce" />
                                <div>
                                    <h3 className="font-semibold text-[#E8D48B] text-sm">Требуется установка на экран «Домой»</h3>
                                    <p className="text-xs text-[#F5ECD7]/70 mt-1 leading-relaxed">
                                        На устройствах Apple (iPhone/iPad) веб-уведомления работают только при запуске сайта с домашнего экрана.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="pl-9 space-y-2.5 text-xs text-[#F5ECD7]/80">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center font-bold text-[10px] text-[#C9A227]">1</span>
                                    <span>Нажмите на кнопку <strong>«Поделиться»</strong> <Share className="w-3.5 h-3.5 inline text-[#C9A227]" /> в панели Safari.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center font-bold text-[10px] text-[#C9A227]">2</span>
                                    <span>Выберите пункт <strong>«На экран "Домой"»</strong> <ArrowUp className="w-3.5 h-3.5 inline text-[#C9A227]" />.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center font-bold text-[10px] text-[#C9A227]">3</span>
                                    <span>Откройте появившееся приложение <strong>Somanatha</strong> с экрана телефона и настройте подписку здесь.</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {(!isIOS || isStandalone) && (
                        <>
                            {/* Checkboxes: О чем уведомлять */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-[#C9A227]/80 uppercase tracking-wider font-elegant">О каких событиях уведомлять:</h3>
                                
                                <div className="space-y-2">
                                    {/* Tithi */}
                                    <label className="flex items-start gap-3 p-3 bg-[#1A1517]/50 border border-[#C9A227]/10 rounded-xl cursor-pointer hover:bg-[#1A1517] transition-all">
                                        <input 
                                            type="checkbox" 
                                            checked={preferences.tithi} 
                                            onChange={() => handleCheckboxChange('tithi')}
                                            className="mt-1 accent-[#C9A227] w-4 h-4 rounded"
                                        />
                                        <div>
                                            <span className="text-sm font-medium">Смена лунных суток (Титхи)</span>
                                            <p className="text-xs text-[#F5ECD7]/50 mt-0.5">Сообщение о переходе в новые ведические лунные сутки (например: Шашти, Экадаши)</p>
                                        </div>
                                    </label>

                                    {/* Nakshatra */}
                                    <label className="flex items-start gap-3 p-3 bg-[#1A1517]/50 border border-[#C9A227]/10 rounded-xl cursor-pointer hover:bg-[#1A1517] transition-all">
                                        <input 
                                            type="checkbox" 
                                            checked={preferences.nakshatra} 
                                            onChange={() => handleCheckboxChange('nakshatra')}
                                            className="mt-1 accent-[#C9A227] w-4 h-4 rounded"
                                        />
                                        <div>
                                            <span className="text-sm font-medium">Лунные созвездия (Накшатры)</span>
                                            <p className="text-xs text-[#F5ECD7]/50 mt-0.5">Вход Луны в новую Накшатру с описанием её характера и влияния</p>
                                        </div>
                                    </label>

                                    {/* Muhurta */}
                                    <label className="flex items-start gap-3 p-3 bg-[#1A1517]/50 border border-[#C9A227]/10 rounded-xl cursor-pointer hover:bg-[#1A1517] transition-all">
                                        <input 
                                            type="checkbox" 
                                            checked={preferences.muhurta} 
                                            onChange={() => handleCheckboxChange('muhurta')}
                                            className="mt-1 accent-[#C9A227] w-4 h-4 rounded"
                                        />
                                        <div>
                                            <span className="text-sm font-medium">Благоприятное время (Мухурты)</span>
                                            <p className="text-xs text-[#F5ECD7]/50 mt-0.5">Уведомления о важных временных отрезках (Прадошама, Брахма-мухурта, Раху Кала)</p>
                                        </div>
                                    </label>

                                    {/* Promotions */}
                                    <label className="flex items-start gap-3 p-3 bg-[#1A1517]/50 border border-[#C9A227]/10 rounded-xl cursor-pointer hover:bg-[#1A1517] transition-all">
                                        <input 
                                            type="checkbox" 
                                            checked={preferences.promotions} 
                                            onChange={() => handleCheckboxChange('promotions')}
                                            className="mt-1 accent-[#C9A227] w-4 h-4 rounded"
                                        />
                                        <div>
                                            <span className="text-sm font-medium">Акции, новинки и подарки</span>
                                            <p className="text-xs text-[#F5ECD7]/50 mt-0.5">Уведомления о закрытых распродажах, скидках к праздникам и новых поступлениях товаров</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Frequency & Quiet Hours */}
                            <div className="space-y-4 pt-2 border-t border-[#C9A227]/10">
                                <h3 className="text-xs font-semibold text-[#C9A227]/80 uppercase tracking-wider font-elegant">Периодичность отправки:</h3>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => handleFrequencyChange('instant')}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            preferences.frequency === 'instant' 
                                            ? 'bg-[#C9A227]/10 border-[#C9A227] text-white' 
                                            : 'bg-[#1A1517]/30 border-[#C9A227]/10 text-[#F5ECD7]/60 hover:border-[#C9A227]/30'
                                        }`}
                                    >
                                        <span className="block text-sm font-medium">Мгновенно</span>
                                        <span className="text-[10px] text-zinc-500 block mt-0.5">При наступлении события</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleFrequencyChange('daily')}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            preferences.frequency === 'daily' 
                                            ? 'bg-[#C9A227]/10 border-[#C9A227] text-white' 
                                            : 'bg-[#1A1517]/30 border-[#C9A227]/10 text-[#F5ECD7]/60 hover:border-[#C9A227]/30'
                                        }`}
                                    >
                                        <span className="block text-sm font-medium">Утренняя сводка</span>
                                        <span className="text-[10px] text-zinc-500 block mt-0.5">Раз в день в 07:30</span>
                                    </button>
                                </div>

                                <label className="flex items-center gap-3 p-3 bg-[#1A1517]/30 border border-[#C9A227]/10 rounded-xl cursor-pointer hover:bg-[#1A1517]/50 transition-all">
                                    <input 
                                        type="checkbox" 
                                        checked={preferences.quietHours} 
                                        onChange={toggleQuietHours}
                                        className="accent-[#C9A227] w-4 h-4 rounded"
                                    />
                                    <div>
                                        <span className="text-xs font-medium">Режим тишины ночью (22:00 – 08:00)</span>
                                        <p className="text-[10px] text-zinc-500">Уведомления не будут будить вас ночью. Все пуши придут утром.</p>
                                    </div>
                                </label>
                            </div>
                            {/* Sound & Lockscreen Instructions Toggle */}
                            <div className="border border-[#C9A227]/20 rounded-xl overflow-hidden bg-[#1A1517]/20">
                                <button 
                                    type="button"
                                    onClick={() => setShowInstructions(!showInstructions)}
                                    className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-[#E8D48B] hover:bg-[#C9A227]/5 transition-all"
                                >
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-[#C9A227]" />
                                        <span>Как включить звук и показ на экране блокировки?</span>
                                    </div>
                                    {showInstructions ? (
                                        <ChevronUp className="w-4 h-4 text-[#C9A227]" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-[#C9A227]" />
                                    )}
                                </button>
                                
                                {showInstructions && (
                                    <div className="p-4 border-t border-[#C9A227]/10 space-y-4 text-xs text-[#F5ECD7]/80 bg-[#0D0A0B]/60 leading-relaxed">
                                        {/* Android / Desktop */}
                                        <div className="space-y-1.5">
                                            <h4 className="font-bold text-[#E8D48B]">🤖 Для Android и ПК (Chrome, Яндекс и др.):</h4>
                                            <p>
                                                По умолчанию браузеры могут присылать уведомления беззвучно. Чтобы они будили вас и отображались при заблокированном экране:
                                            </p>
                                            <ol className="list-decimal pl-4 space-y-1 mt-1 text-[#F5ECD7]/70">
                                                <li>Зайдите в настройки телефона <strong>→ Приложения → Все приложения</strong>.</li>
                                                <li>Выберите ваш браузер (например, <strong>Chrome</strong>) и откройте раздел <strong>Уведомления</strong>.</li>
                                                <li>Прокрутите вниз до пункта <strong>«Сайты»</strong> (или «Уведомления от сайтов») и найдите адрес сайта.</li>
                                                <li>Включите переключатели <strong>«Звук»</strong>, <strong>«Вибрация»</strong>, <strong>«Всплывающие уведомления»</strong> и выберите показ <strong>«На экране блокировки»</strong>.</li>
                                            </ol>
                                        </div>

                                        {/* iOS (iPhone/iPad) */}
                                        <div className="space-y-1.5 pt-3 border-t border-[#C9A227]/10">
                                            <h4 className="font-bold text-[#E8D48B]">🍎 Для iPhone и iPad (iOS 16.4+):</h4>
                                            <p>
                                                На устройствах Apple пуш-уведомления работают только после установки сайта в качестве веб-приложения:
                                            </p>
                                            <ol className="list-decimal pl-4 space-y-1 mt-1 text-[#F5ECD7]/70">
                                                <li>Добавьте сайт на экран «Домой» (нажмите <strong>«Поделиться»</strong> <Share className="w-3.5 h-3.5 inline text-[#C9A227]" /> <strong>→ «На экран Домой»</strong>) и запустите его.</li>
                                                <li>Зайдите в системные настройки устройства <strong>→ Уведомления → Somanatha</strong>.</li>
                                                <li>Разрешите допуск уведомлений, включите звуки и показ на заблокированном экране.</li>
                                            </ol>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Location Details Info */}
                            <div className="flex flex-col gap-3 bg-[#C9A227]/5 border border-[#C9A227]/10 p-4 rounded-xl">
                                <div className="flex items-start gap-2.5 text-xs text-[#F5ECD7]/80">
                                    <Info className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                                    <p>
                                        Расчеты адаптированы под выбранный город. От него зависит точность времени прихода уведомлений о мухуртах.
                                    </p>
                                </div>
                                <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#C9A227]/10">
                                    <span className="text-xs text-[#F5ECD7]/60">Текущий город:</span>
                                    <LocationSelector currentLocationName={cityName} />
                                </div>
                            </div>

                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-[#C9A227]/10 bg-[#0A0809] flex flex-col sm:flex-row gap-3 justify-end items-center">
                    {(!isIOS || isStandalone) && isSupported && (
                        <>
                            {isSubscribed ? (
                                <>
                                    <button 
                                        onClick={handleSubscribe}
                                        disabled={isSubmitting}
                                        className="w-full sm:w-auto bg-[#C9A227] hover:bg-[#C9A227]/80 text-[#0D0A0B] px-6 py-2.5 rounded-full font-medium text-sm flex items-center justify-center gap-2 transition-all"
                                    >
                                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Сохранить настройки
                                    </button>
                                    <button 
                                        onClick={handleUnsubscribe}
                                        disabled={isSubmitting}
                                        className="w-full sm:w-auto border border-red-500/30 hover:border-red-500 text-red-500 hover:bg-red-500/10 px-6 py-2.5 rounded-full font-medium text-xs flex items-center justify-center gap-2 transition-all"
                                    >
                                        <BellOff className="w-4 h-4" />
                                        Отписаться
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={handleSubscribe}
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto bg-gradient-to-r from-[#C9A227] to-[#E8D48B] hover:from-[#C9A227]/90 hover:to-[#E8D48B]/90 text-[#0D0A0B] px-8 py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-102 hover:shadow-[0_0_20px_rgba(201,162,39,0.3)]"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-[#0D0A0B]" />
                                    ) : (
                                        <Bell className="w-4 h-4 text-[#0D0A0B]" />
                                    )}
                                    Разрешить уведомления
                                </button>
                            )}
                        </>
                    )}

                    {isIOS && !isStandalone && (
                        <button 
                            onClick={onClose}
                            className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-2.5 rounded-full font-medium text-sm transition-all"
                        >
                            Понятно
                        </button>
                    )}

                    {!isSupported && (
                        <div className="w-full text-center text-xs text-red-400 p-2">
                            Уведомления не поддерживаются в этом браузере. Используйте Safari на iOS (добавив сайт на экран Домой) или Chrome/Firefox на Android/ПК.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
