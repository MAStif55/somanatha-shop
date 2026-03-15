'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { Rocket, ExternalLink, CheckCircle, XCircle } from 'lucide-react';

type DeployStatus = 'idle' | 'loading' | 'success' | 'error';

export default function DeployButton() {
    const [status, setStatus] = useState<DeployStatus>('idle');
    const [message, setMessage] = useState('');

    const handleDeploy = async () => {
        if (status === 'loading') return;

        setStatus('loading');
        setMessage('');

        try {
            const functions = getFunctions(app);
            const triggerDeploy = httpsCallable(functions, 'triggerDeploy');
            await triggerDeploy();

            setStatus('success');
            setMessage('Deploy triggered! Check GitHub Actions for build progress.');

            // Reset after 10 seconds
            setTimeout(() => {
                setStatus('idle');
                setMessage('');
            }, 10000);
        } catch (error: unknown) {
            setStatus('error');
            const err = error as { message?: string };
            setMessage(err.message || 'Failed to trigger deploy. Please try again.');

            setTimeout(() => {
                setStatus('idle');
                setMessage('');
            }, 8000);
        }
    };

    return (
        <div className="space-y-3">
            <button
                onClick={handleDeploy}
                disabled={status === 'loading'}
                className={`
                    flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg
                    font-semibold text-sm transition-all duration-200
                    ${status === 'loading'
                        ? 'bg-amber-100 text-amber-700 cursor-wait border-2 border-amber-300'
                        : status === 'success'
                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                            : status === 'error'
                                ? 'bg-red-100 text-red-700 border-2 border-red-300'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] border-2 border-indigo-600 hover:border-indigo-700'
                    }
                `}
            >
                {status === 'loading' ? (
                    <>
                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        Deploying...
                    </>
                ) : status === 'success' ? (
                    <>
                        <CheckCircle size={16} />
                        Triggered!
                    </>
                ) : status === 'error' ? (
                    <>
                        <XCircle size={16} />
                        Failed
                    </>
                ) : (
                    <>
                        <Rocket size={16} />
                        Deploy Site
                    </>
                )}
            </button>

            {message && (
                <p className={`text-xs font-medium px-1 ${
                    status === 'success' ? 'text-green-600' :
                    status === 'error' ? 'text-red-600' :
                    'text-gray-500'
                }`}>
                    {message}
                </p>
            )}

            <a
                href="https://github.com/MAStif55/somanatha-shop/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors font-medium"
            >
                <ExternalLink size={12} />
                View GitHub Actions
            </a>
        </div>
    );
}
