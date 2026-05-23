'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { 
    Bell, 
    Send, 
    Users, 
    Smartphone, 
    Sliders, 
    Clock, 
    History, 
    Loader2, 
    CheckCircle, 
    AlertTriangle,
    Trash2
} from 'lucide-react';

interface StatsData {
    total: number;
    platforms: { ios: number; android: number; desktop: number };
    preferences: { tithi: number; nakshatra: number; muhurta: number; promotions: number };
    frequency: { instant: number; daily: number };
}

interface CampaignLog {
    title: string;
    body: string;
    sentAt: string;
    sentCount: number;
    successCount: number;
    failedCount: number;
    targetFilter: string;
}

export default function PushAdminDashboard() {
    const { locale } = useTranslation();
    const [stats, setStats] = useState<StatsData>({
        total: 0,
        platforms: { ios: 0, android: 0, desktop: 0 },
        preferences: { tithi: 0, nakshatra: 0, muhurta: 0, promotions: 0 },
        frequency: { instant: 0, daily: 0 }
    });
    const [campaigns, setCampaigns] = useState<CampaignLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTriggeringCron, setIsTriggeringCron] = useState(false);
    const [cronResult, setCronResult] = useState<{ success?: boolean; message?: string } | null>(null);

    // Form states
    const [title, setTitle] = useState('');
    const [bodyText, setBodyText] = useState('');
    const [targetFilter, setTargetFilter] = useState('all');
    const [image, setImage] = useState('');
    const [url, setUrl] = useState('/panchanga');
    const [quickActions, setQuickActions] = useState<string[]>([]); // 'calendar', 'shop'
    
    // Submitting campaign states
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState<{ success?: boolean; message?: string } | null>(null);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/push/stats');
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
                setCampaigns(data.campaigns || []);
            }
        } catch (error) {
            console.error('Error fetching push stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleTriggerCron = async () => {
        setIsTriggeringCron(true);
        setCronResult(null);
        try {
            const res = await fetch('/api/admin/push/trigger-cron', {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setCronResult({
                    success: true,
                    message: `Успешно! Отправлено: ${data.data.notificationsSent}, удалено нерабочих: ${data.data.deadTokensRemoved}`
                });
                fetchStats();
            } else {
                setCronResult({
                    success: false,
                    message: data.error || 'Ошибка при вызове крона'
                });
            }
        } catch (error: any) {
            setCronResult({
                success: false,
                message: error.message || 'Ошибка сети'
            });
        } finally {
            setIsTriggeringCron(false);
        }
    };

    const handleSendPush = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !bodyText) {
            setSendStatus({ success: false, message: 'Заполните заголовок и текст сообщения' });
            return;
        }

        setIsSending(true);
        setSendStatus(null);

        // Build actions based on quickActions selection
        const actions: any[] = [];
        if (quickActions.includes('calendar')) {
            actions.push({ action: 'muhurta', title: '🗓️ Календарь', url: '/panchanga' });
        }
        if (quickActions.includes('shop')) {
            actions.push({ action: 'shop', title: '🛒 В магазин', url: '/' });
        }

        try {
            const res = await fetch('/api/admin/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    bodyText,
                    image,
                    url,
                    actions,
                    targetFilter
                })
            });

            const data = await res.json();
            if (data.success) {
                setSendStatus({ 
                    success: true, 
                    message: `Рассылка завершена! Отправлено: ${data.sentCount}, Успешно: ${data.successCount}, Очищено токенов: ${data.failedCount}` 
                });
                // Reset form
                setTitle('');
                setBodyText('');
                setImage('');
                setUrl('/panchanga');
                setQuickActions([]);
                // Reload stats
                fetchStats();
            } else {
                setSendStatus({ success: false, message: data.error || 'Не удалось отправить уведомления' });
            }
        } catch (error) {
            console.error('Error sending push campaign:', error);
            setSendStatus({ success: false, message: 'Ошибка сети при отправке рассылки' });
        } finally {
            setIsSending(false);
        }
    };

    const toggleQuickAction = (action: string) => {
        if (quickActions.includes(action)) {
            setQuickActions(prev => prev.filter(a => a !== action));
        } else {
            setQuickActions(prev => [...prev, action]);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                <p className="text-zinc-500 text-sm">Загрузка аналитики...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="admin-page-title">Управление пуш-рассылками</h1>
                    <p className="admin-page-subtitle">
                        Сегментация подписчиков, детальная статистика каналов и отправка мгновенных трансляций.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <button
                        onClick={handleTriggerCron}
                        disabled={isTriggeringCron}
                        className="admin-btn-secondary py-2.5 px-4 text-xs font-semibold rounded-xl flex items-center gap-2 border border-zinc-200 hover:bg-zinc-50"
                    >
                        {isTriggeringCron ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Clock className="w-3.5 h-3.5" />
                        )}
                        Тест утренней сводки (Force Cron)
                    </button>
                    {cronResult && (
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                            cronResult.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                            {cronResult.message}
                        </span>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total subscribers */}
                <div className="admin-stat-card" style={{ borderTop: '3px solid #E67E22' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 rounded-xl bg-orange-500/10">
                            <Users className="w-5 h-5 text-orange-500" />
                        </div>
                        <span className="text-2xl font-bold">{stats.total}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-500">Активных подписчиков</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">Всего уникальных токенов в базе</p>
                </div>

                {/* Platforms breakdown */}
                <div className="admin-stat-card" style={{ borderTop: '3px solid #3b82f6' }}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2.5 rounded-xl bg-blue-500/10">
                            <Smartphone className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex gap-2.5 text-xs font-bold text-zinc-700">
                            <span className="text-blue-500">iOS: {stats.platforms.ios}</span>
                            <span className="text-emerald-500">Android: {stats.platforms.android}</span>
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-500">Разбивка по платформам</h3>
                    <div className="w-full bg-zinc-200 h-1.5 rounded-full mt-2 overflow-hidden flex">
                        <div 
                            className="bg-blue-500 h-full" 
                            style={{ width: `${stats.total > 0 ? (stats.platforms.ios / stats.total) * 100 : 0}%` }}
                            title="iOS"
                        ></div>
                        <div 
                            className="bg-emerald-500 h-full" 
                            style={{ width: `${stats.total > 0 ? (stats.platforms.android / stats.total) * 100 : 0}%` }}
                            title="Android"
                        ></div>
                        <div 
                            className="bg-zinc-400 h-full" 
                            style={{ width: `${stats.total > 0 ? (stats.platforms.desktop / stats.total) * 100 : 0}%` }}
                            title="Desktop"
                        ></div>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">Остальное: Desktop ({stats.platforms.desktop})</p>
                </div>

                {/* Preferences */}
                <div className="admin-stat-card" style={{ borderTop: '3px solid #10b981' }}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10">
                            <Sliders className="w-5 h-5 text-emerald-500" />
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-500">Интересы и галочки</h3>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-zinc-500 mt-2">
                        <div>Титхи: <span className="font-semibold text-zinc-700">{stats.preferences.tithi}</span></div>
                        <div>Накшатры: <span className="font-semibold text-zinc-700">{stats.preferences.nakshatra}</span></div>
                        <div>Мухурта: <span className="font-semibold text-zinc-700">{stats.preferences.muhurta}</span></div>
                        <div>Акции: <span className="font-semibold text-zinc-700">{stats.preferences.promotions}</span></div>
                    </div>
                </div>

                {/* Frequency */}
                <div className="admin-stat-card" style={{ borderTop: '3px solid #8b5cf6' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 rounded-xl bg-violet-500/10">
                            <Clock className="w-5 h-5 text-violet-500" />
                        </div>
                        <div className="text-[11px] text-zinc-500">
                            Мгновенно: <span className="font-semibold text-zinc-700">{stats.frequency.instant}</span>
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-500">Частота рассылок</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">
                        Выбрали суточную сводку: <span className="font-semibold text-zinc-700">{stats.frequency.daily}</span> пользователей.
                    </p>
                </div>
            </div>

            {/* Campaign Form & Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Send push form */}
                <div className="lg:col-span-1 admin-section-card space-y-4">
                    <h2 className="admin-section-title flex items-center gap-2">
                        <Send className="w-4 h-4 text-orange-500" />
                        Новая кампания
                    </h2>

                    <form onSubmit={handleSendPush} className="space-y-4">
                        {/* Title */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500">Заголовок push-сообщения</label>
                            <input 
                                type="text"
                                placeholder="Например: 🪐 Суббота — день Сатурна"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-[#fcfcfc] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm"
                                required
                            />
                        </div>

                        {/* Body */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500">Текст сообщения (коротко)</label>
                            <textarea 
                                placeholder="Например: Рекомендуется уделить время самопознанию и аскезе..."
                                value={bodyText}
                                onChange={(e) => setBodyText(e.target.value)}
                                className="w-full bg-[#fcfcfc] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm h-24 resize-none"
                                maxLength={200}
                                required
                            />
                        </div>

                        {/* Target Filter */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500">Целевая аудитория (сегмент)</label>
                            <select 
                                value={targetFilter}
                                onChange={(e) => setTargetFilter(e.target.value)}
                                className="w-full bg-[#fcfcfc] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                            >
                                <option value="all">Все пользователи ({stats.total})</option>
                                <option value="promotions">Подписчики на Акции ({stats.preferences.promotions})</option>
                                <option value="tithi">Подписанные на Титхи ({stats.preferences.tithi})</option>
                                <option value="nakshatra">Подписанные на Накшатры ({stats.preferences.nakshatra})</option>
                                <option value="muhurta">Подписанные на Мухурты ({stats.preferences.muhurta})</option>
                            </select>
                        </div>

                        {/* URL Destination */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500">Ссылка перехода (при клике)</label>
                            <input 
                                type="text"
                                placeholder="Например: /panchanga или /catalog"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full bg-[#fcfcfc] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm"
                            />
                        </div>

                        {/* Image URL (Optional) */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500">URL изображения баннера (необязательно)</label>
                            <input 
                                type="text"
                                placeholder="Например: /images/full-moon.jpg"
                                value={image}
                                onChange={(e) => setImage(e.target.value)}
                                className="w-full bg-[#fcfcfc] border border-zinc-200 rounded-xl px-4 py-2.5 text-sm"
                            />
                        </div>

                        {/* Action buttons shortcuts */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-500 block">Быстрые кнопки действия под пушем:</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => toggleQuickAction('calendar')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                        quickActions.includes('calendar')
                                            ? 'bg-amber-500/10 border-amber-500 text-amber-600'
                                            : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                                >
                                    🗓️ Календарь
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleQuickAction('shop')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                        quickActions.includes('shop')
                                            ? 'bg-amber-500/10 border-amber-500 text-amber-600'
                                            : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                                >
                                    🛒 Магазин
                                </button>
                            </div>
                        </div>

                        {/* Status alert message */}
                        {sendStatus && (
                            <div className={`p-3 rounded-xl text-xs flex gap-2 items-start ${
                                sendStatus.success ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                            }`}>
                                {sendStatus.success ? (
                                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                )}
                                <span>{sendStatus.message}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSending}
                            className="w-full admin-btn-primary justify-center py-3 text-sm font-semibold rounded-xl"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    Отправка рассылки...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 text-white" />
                                    Запустить рассылку
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Campaign logs history */}
                <div className="lg:col-span-2 admin-section-card space-y-4">
                    <h2 className="admin-section-title flex items-center gap-2">
                        <History className="w-4 h-4 text-orange-500" />
                        История рассылок и «здоровье» токенов
                    </h2>

                    {campaigns.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 text-sm font-light">
                            Истории отправки рассылок пока нет. Отправьте первую кампанию слева.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-zinc-200">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-zinc-50 border-b border-zinc-200">
                                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase">Дата</th>
                                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase">Кампания / Текст</th>
                                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase">Сегмент</th>
                                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase text-center">Всего</th>
                                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase text-center text-emerald-600">Доставлено</th>
                                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase text-center text-red-500">Мертвые (410)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {campaigns.map((camp, idx) => {
                                        const dateStr = new Date(camp.sentAt).toLocaleString('ru-RU', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });
                                        return (
                                            <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                                                <td className="p-3 font-medium text-zinc-700 whitespace-nowrap">{dateStr}</td>
                                                <td className="p-3 max-w-xs">
                                                    <div className="font-semibold text-zinc-800 truncate">{camp.title}</div>
                                                    <div className="text-xs text-zinc-400 truncate mt-0.5">{camp.body}</div>
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded-md text-[10px] font-medium text-zinc-600">
                                                        {camp.targetFilter === 'all' && 'Все'}
                                                        {camp.targetFilter === 'promotions' && 'Акции'}
                                                        {camp.targetFilter === 'tithi' && 'Титхи'}
                                                        {camp.targetFilter === 'nakshatra' && 'Накшатры'}
                                                        {camp.targetFilter === 'muhurta' && 'Мухурты'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center font-medium text-zinc-800">{camp.sentCount}</td>
                                                <td className="p-3 text-center font-bold text-emerald-600 bg-emerald-500/[0.02]">{camp.successCount}</td>
                                                <td className="p-3 text-center font-bold text-red-500 bg-red-500/[0.02]">{camp.failedCount}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
