'use client';

import { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';

/**
 * Reusable Confirmation Modal
 * 
 * A flexible modal for confirmations, with support for:
 * - Multiple variants (danger, warning, default)
 * - Optional save button for unsaved changes scenarios
 * - Keyboard (Escape) and backdrop dismissal
 */

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
    onSave?: () => void;
    saveLabel?: string;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    saveLabel = 'Save & Close',
    variant = 'default',
    onConfirm,
    onCancel,
    onSave
}: ConfirmModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Escape key to close
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onCancel();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const confirmStyles = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        default: 'bg-blue-600 hover:bg-blue-700 text-white'
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
        >
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center space-x-3">
                        {variant === 'danger' && <AlertTriangle className="text-red-500" size={24} />}
                        {variant === 'warning' && <AlertTriangle className="text-yellow-500" size={24} />}
                        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-gray-600">{message}</p>
                </div>
                <div className="flex justify-end space-x-3 p-4 bg-gray-50 border-t">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    {onSave && (
                        <button
                            onClick={onSave}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                            {saveLabel}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-lg transition-colors ${confirmStyles[variant]}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
