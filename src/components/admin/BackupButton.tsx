'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { Download, Archive, CheckCircle, XCircle, Clock } from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type BackupStatus = 'idle' | 'generating' | 'ready' | 'error';

interface BackupResult {
    success: boolean;
    downloadUrl: string;
    filename: string;
    generatedAt: string;
    stats: {
        products: number;
        orders: number;
        customers: number;
        reviews: number;
        mediaFiles: number;
        mediaSkipped: number;
        durationSeconds: number;
    };
}

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

/** Cooldown between backups — 5 minutes */
const COOLDOWN_MS = 5 * 60 * 1000;

/** Download link expires in 60 minutes — show a countdown */
const LINK_TTL_MS = 60 * 60 * 1000;

const STORAGE_KEY = 'admin_last_backup_ts';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}с`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}м ${s}с`;
}

function formatCountdown(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export default function BackupButton() {
    const [status, setStatus] = useState<BackupStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [result, setResult] = useState<BackupResult | null>(null);

    // Countdown until the signed URL expires (seconds from generation)
    const [linkExpiresIn, setLinkExpiresIn] = useState<number | null>(null);

    // How many seconds have elapsed during generation (shown in the spinner)
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Cooldown: how many ms remain before the user can trigger again
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    // ── Cooldown timer ──────────────────────────────────────
    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const lastTs = parseInt(raw, 10);
        const elapsed = Date.now() - lastTs;
        if (elapsed < COOLDOWN_MS) {
            setCooldownRemaining(COOLDOWN_MS - elapsed);
        }
    }, []);

    useEffect(() => {
        if (cooldownRemaining <= 0) return;
        const interval = setInterval(() => {
            setCooldownRemaining(prev => {
                const next = prev - 1000;
                return next <= 0 ? 0 : next;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [cooldownRemaining]);

    // ── Elapsed time during generation ──────────────────────
    useEffect(() => {
        if (status !== 'generating') {
            setElapsedSeconds(0);
            return;
        }
        const interval = setInterval(() => {
            setElapsedSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [status]);

    // ── Link expiry countdown ───────────────────────────────
    useEffect(() => {
        if (status !== 'ready' || result === null) {
            setLinkExpiresIn(null);
            return;
        }

        const generatedMs = new Date(result.generatedAt).getTime();
        const expiresMs = generatedMs + LINK_TTL_MS;

        const tick = () => {
            const remaining = expiresMs - Date.now();
            if (remaining <= 0) {
                setLinkExpiresIn(0);
                setStatus('idle');
                setResult(null);
            } else {
                setLinkExpiresIn(remaining);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [status, result]);

    // ── Trigger backup ──────────────────────────────────────
    const handleCreateBackup = useCallback(async () => {
        if (status === 'generating' || cooldownRemaining > 0) return;

        setStatus('generating');
        setErrorMessage('');
        setResult(null);

        try {
            const functions = getFunctions(app);
            const createBackup = httpsCallable<unknown, BackupResult>(functions, 'createBackup');
            const response = await createBackup({});

            const data = response.data;

            // Persist cooldown timestamp
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
            setCooldownRemaining(COOLDOWN_MS);

            setResult(data);
            setStatus('ready');

            // Auto-trigger browser download
            const a = document.createElement('a');
            a.href = data.downloadUrl;
            a.download = data.filename;
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        } catch (error: unknown) {
            setStatus('error');
            const err = error as { message?: string };
            setErrorMessage(err.message || 'Не удалось создать резервную копию. Попробуйте ещё раз.');

            setTimeout(() => {
                setStatus('idle');
                setErrorMessage('');
            }, 10000);
        }
    }, [status, cooldownRemaining]);

    // ─────────────────────────────────────────────────────────
    // Render helpers
    // ─────────────────────────────────────────────────────────

    const isCoolingDown = cooldownRemaining > 0 && status === 'idle';
    const isDisabled = status === 'generating' || isCoolingDown;

    const buttonClass = [
        'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg',
        'font-semibold text-sm transition-all duration-200 border-2',
        status === 'generating'
            ? 'bg-amber-50 text-amber-700 cursor-wait border-amber-300'
            : status === 'ready'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : status === 'error'
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : isCoolingDown
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                        : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.98] border-violet-600 hover:border-violet-700',
    ].join(' ');

    return (
        <div className="space-y-3">
            {/* ── Main button ── */}
            <button
                id="create-backup-btn"
                onClick={handleCreateBackup}
                disabled={isDisabled}
                className={buttonClass}
            >
                {status === 'generating' ? (
                    <>
                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        <span>Создание резервной копии… {formatDuration(elapsedSeconds)}</span>
                    </>
                ) : status === 'ready' ? (
                    <>
                        <CheckCircle size={16} className="flex-shrink-0" />
                        <span>Готово — файл скачан</span>
                    </>
                ) : status === 'error' ? (
                    <>
                        <XCircle size={16} className="flex-shrink-0" />
                        <span>Ошибка создания копии</span>
                    </>
                ) : isCoolingDown ? (
                    <>
                        <Clock size={16} className="flex-shrink-0" />
                        <span>Повторно через {formatCountdown(cooldownRemaining)}</span>
                    </>
                ) : (
                    <>
                        <Archive size={16} className="flex-shrink-0" />
                        <span>Создать резервную копию</span>
                    </>
                )}
            </button>

            {/* ── Error message ── */}
            {status === 'error' && errorMessage && (
                <p className="text-xs font-medium px-1 text-red-600">
                    {errorMessage}
                </p>
            )}

            {/* ── Success details card ── */}
            {status === 'ready' && result && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-xs text-gray-500">Товаров</p>
                            <p className="text-sm font-bold text-gray-800">{result.stats.products}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Заказов</p>
                            <p className="text-sm font-bold text-gray-800">{result.stats.orders}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Медиафайлов</p>
                            <p className="text-sm font-bold text-gray-800">{result.stats.mediaFiles}</p>
                        </div>
                    </div>

                    {/* Duration + skipped warning */}
                    <p className="text-xs text-gray-500 text-center">
                        Сформировано за {formatDuration(result.stats.durationSeconds)}
                        {result.stats.mediaSkipped > 0 && (
                            <span className="text-amber-600 ml-1">
                                · {result.stats.mediaSkipped} файлов пропущено
                            </span>
                        )}
                    </p>

                    {/* Re-download link with expiry countdown */}
                    <a
                        href={result.downloadUrl}
                        download={result.filename}
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-md bg-white border border-emerald-300 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                        <Download size={12} />
                        Скачать повторно
                        {linkExpiresIn !== null && (
                            <span className="ml-1 text-gray-400">
                                (ссылка истекает через {formatCountdown(linkExpiresIn)})
                            </span>
                        )}
                    </a>
                </div>
            )}

            {/* ── Hint text when idle ── */}
            {status === 'idle' && !isCoolingDown && (
                <p className="text-xs text-gray-400 px-1">
                    Экспортирует все товары, заказы, медиафайлы и настройки в ZIP-архив.
                    Ссылка для скачивания действительна 60 минут.
                </p>
            )}
        </div>
    );
}
