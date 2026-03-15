'use client';

import { useEffect, useState } from 'react';
import { useToastStore, Toast } from '@/store/toast-store';
import { Check, X, ShoppingBag, Info, AlertCircle } from 'lucide-react';

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
    const [isExiting, setIsExiting] = useState(false);
    const [isEntering, setIsEntering] = useState(true);

    useEffect(() => {
        // Entry animation
        const enterTimer = setTimeout(() => setIsEntering(false), 50);

        // Exit animation before removal
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, (toast.duration || 3000) - 300);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(exitTimer);
        };
    }, [toast.duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onRemove, 300);
    };

    const icons = {
        success: <ShoppingBag className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
    };

    const colors = {
        success: 'from-[#1A1517] to-[#1A1517] border-[#C9A227]/60 text-[#E8D48B]',
        error: 'from-red-900/90 to-red-950/90 border-red-500/60 text-red-200',
        info: 'from-blue-900/90 to-blue-950/90 border-blue-500/60 text-blue-200',
    };

    const iconBg = {
        success: 'bg-[#C9A227]/20 text-[#C9A227]',
        error: 'bg-red-500/20 text-red-400',
        info: 'bg-blue-500/20 text-blue-400',
    };

    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl
                bg-gradient-to-r ${colors[toast.type]}
                transform transition-all duration-300 ease-out
                ${isEntering ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
                ${isExiting ? 'translate-x-full opacity-0' : ''}
            `}
        >
            {/* Icon */}
            <div className={`p-2 rounded-lg ${iconBg[toast.type]}`}>
                {toast.type === 'success' ? <Check className="w-5 h-5" /> : icons[toast.type]}
            </div>

            {/* Message */}
            <p className="font-medium text-sm flex-1 pr-2">{toast.message}</p>

            {/* Close Button */}
            <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function ToastContainer() {
    const { toasts, removeToast } = useToastStore();
    const [mounted, setMounted] = useState(false);

    // Only render on client to prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
                </div>
            ))}
        </div>
    );
}
