'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Message {
    id: string;
    sender: 'admin' | 'client';
    text: string;
    fileUrl: string | null;
    createdAt: number;
}

interface OrderChatProps {
    orderId: string;
    userType: 'client' | 'admin';
}

const isImageFile = (url: string) => {
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.png') || 
           cleanUrl.endsWith('.jpg') || 
           cleanUrl.endsWith('.jpeg') || 
           cleanUrl.endsWith('.webp') || 
           cleanUrl.endsWith('.gif') ||
           cleanUrl.endsWith('.svg');
};

export default function OrderChat({ orderId, userType }: OrderChatProps) {
    const { locale } = useLanguage();
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [uploadingFile, setUploadingFile] = useState<{ name: string; progress: number } | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
        chatEndRef.current?.scrollIntoView({ behavior });
    };

    // 1. Fetch History & Set Up SSE Stream
    useEffect(() => {
        let active = true;

        // Fetch existing messages
        fetch(`/api/orders/${orderId}/chat`)
            .then(res => res.json())
            .then(data => {
                if (active && data.success) {
                    const formatted = (data.messages || []).map((m: any) => ({
                        ...m,
                        id: m._id?.toString() || m.id
                    }));
                    setMessages(formatted);
                    setTimeout(() => scrollToBottom('auto'), 50);
                }
            })
            .catch(err => console.error('Error fetching chat history:', err));

        // Open SSE connection
        const es = new EventSource(`/api/orders/${orderId}/chat`);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            if (!active) return;
            try {
                const newMsg = JSON.parse(event.data);
                // Prevent duplicate messages in state
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id || (m.createdAt === newMsg.createdAt && m.text === newMsg.text))) {
                        return prev;
                    }
                    return [...prev, newMsg];
                });
                setTimeout(() => scrollToBottom('smooth'), 50);
            } catch (err) {
                console.error('Error parsing SSE message:', err);
            }
        };

        es.onerror = (err) => {
            console.warn('SSE stream encountered an error (will auto-reconnect):', err);
        };

        return () => {
            active = false;
            if (es) {
                es.close();
            }
        };
    }, [orderId]);

    // 2. Send Message
    const handleSend = async (e?: React.FormEvent, attachedUrl?: string) => {
        if (e) e.preventDefault();
        if (!text.trim() && !attachedUrl) return;

        setIsSending(true);
        const textToSend = text;
        setText(''); // Clear input early for better UX

        try {
            const res = await fetch(`/api/orders/${orderId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textToSend,
                    fileUrl: attachedUrl || null,
                    sender: userType
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to send');
            }

            // Msg will be added automatically by SSE event, but just in case:
            setMessages(prev => {
                if (prev.some(m => m.id === data.message.id)) return prev;
                return [...prev, data.message];
            });
            setTimeout(() => scrollToBottom('smooth'), 50);
        } catch (err) {
            console.error('Send error:', err);
            alert(locale === 'ru' ? 'Ошибка отправки сообщения' : 'Failed to send message');
            setText(textToSend); // Restore text on failure
        } finally {
            setIsSending(false);
        }
    };

    // 3. Handle File Attachment
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSizeBytes = 30 * 1024 * 1024; // 30MB in chat
        if (file.size > maxSizeBytes) {
            alert(locale === 'ru' ? 'Файл слишком большой. Лимит: 30 МБ' : 'File is too large. Limit is 30MB');
            return;
        }

        setUploadingFile({ name: file.name, progress: 0 });

        try {
            // Get Presigned URL
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type,
                    tempId: orderId, // upload to this order's folder
                }),
            });

            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || !uploadData.success) {
                throw new Error(uploadData.error || 'Failed to get upload link');
            }

            const { uploadUrl, publicUrl } = uploadData;

            // Upload directly to S3
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    setUploadingFile({ name: file.name, progress: percent });
                }
            };

            xhr.onload = async () => {
                setUploadingFile(null);
                if (xhr.status === 200) {
                    // Send the message with file URL
                    await handleSend(undefined, publicUrl);
                } else {
                    alert(locale === 'ru' ? 'Загрузка файла не удалась' : 'File upload failed');
                }
            };

            xhr.onerror = () => {
                setUploadingFile(null);
                alert(locale === 'ru' ? 'Ошибка сети при загрузке' : 'Network error during upload');
            };

            xhr.send(file);
        } catch (err) {
            console.error('Chat file upload error:', err);
            setUploadingFile(null);
            alert(locale === 'ru' ? 'Не удалось загрузить файл' : 'Could not upload file');
        }
    };

    return (
        <div className="flex flex-col h-[500px] bg-[#1A1517]/80 backdrop-blur-sm border border-[#C9A227]/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(201,162,39,0.05)]">
            {/* Header */}
            <div className="bg-[#0D0A0B] border-b border-[#C9A227]/20 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
                    <h4 className="font-bold text-[#E8D48B]">
                        {locale === 'ru' ? 'Обсуждение макета' : 'Layout Discussion'}
                    </h4>
                </div>
                <span className="text-xs text-[#F5ECD7]/60">
                    {userType === 'client' 
                        ? (locale === 'ru' ? 'Мастер онлайн' : 'Master Online') 
                        : (locale === 'ru' ? 'Клиент' : 'Client')}
                </span>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0D0A0B]/50 scrollbar-thin scrollbar-thumb-[#C9A227]/30 scrollbar-track-transparent hover:scrollbar-thumb-[#C9A227]/50">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center text-sm text-[#F5ECD7]/40 px-4">
                        {locale === 'ru' 
                            ? 'Напишите сообщение или прикрепите макет, чтобы начать обсуждение.' 
                            : 'Send a message or attach a layout to start the discussion.'}
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isAdminMsg = msg.sender === 'admin';
                        const isOwnMsg = (userType === 'admin' && isAdminMsg) || (userType === 'client' && !isAdminMsg);
                        
                        return (
                            <div
                                key={msg.id || idx}
                                className={`flex ${isOwnMsg ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm flex flex-col ${
                                        isOwnMsg
                                            ? 'bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] rounded-tr-none'
                                            : 'bg-[#1A1517] text-[#F5ECD7] border border-[#C9A227]/20 rounded-tl-none'
                                    }`}
                                >
                                    {/* Sender Label */}
                                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                        isOwnMsg ? 'text-[#0D0A0B]/70' : 'text-[#C9A227]'
                                    }`}>
                                        {isOwnMsg 
                                            ? (locale === 'ru' ? 'Вы' : 'You')
                                            : (isAdminMsg 
                                                ? (locale === 'ru' ? 'Мастер' : 'Master') 
                                                : (locale === 'ru' ? 'Клиент' : 'Client'))}
                                    </span>

                                    {/* Text */}
                                    {msg.text && <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.text}</p>}

                                    {/* Attachment */}
                                    {msg.fileUrl && (
                                        isImageFile(msg.fileUrl) ? (
                                            <div className="mt-2 space-y-1">
                                                <div className={`rounded-xl overflow-hidden max-w-[260px] shadow-sm relative group ${isOwnMsg ? 'border border-[#0D0A0B]/20 bg-black/10' : 'border border-[#C9A227]/20 bg-[#0D0A0B]/50'}`}>
                                                    <img 
                                                        src={msg.fileUrl} 
                                                        alt="Attachment preview" 
                                                        className="w-full h-auto max-h-[200px] object-contain cursor-zoom-in hover:scale-[1.02] transition-transform duration-300"
                                                        onClick={() => window.open(msg.fileUrl!, '_blank')} 
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5 px-0.5">
                                                    <a
                                                        href={msg.fileUrl}
                                                        download
                                                        className={`text-[11px] font-bold underline transition-colors hover:opacity-80 ${
                                                            isOwnMsg ? 'text-[#0D0A0B]/80 hover:text-[#0D0A0B]' : 'text-[#C9A227] hover:text-[#E8D48B]'
                                                        }`}
                                                    >
                                                        {locale === 'ru' ? 'Скачать' : 'Download'}
                                                    </a>
                                                    <span className={`text-[10px] ${isOwnMsg ? 'text-[#0D0A0B]/40' : 'text-[#F5ECD7]/40'}`}>•</span>
                                                    <span className={`text-[10px] truncate max-w-[120px] ${isOwnMsg ? 'text-[#0D0A0B]/60' : 'text-[#F5ECD7]/50'}`}>
                                                        {decodeURIComponent(msg.fileUrl.substring(msg.fileUrl.lastIndexOf('/') + 1)).replace(/^[a-f0-9-]{36}-/, '')}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`mt-2 p-3 rounded-lg flex items-center gap-3 border ${
                                                isOwnMsg 
                                                    ? 'bg-black/10 border-[#0D0A0B]/20 text-[#0D0A0B]' 
                                                    : 'bg-[#0D0A0B] border-[#C9A227]/20 text-[#F5ECD7]'
                                            }`}>
                                                <span className="text-2xl">📎</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate">
                                                        {decodeURIComponent(msg.fileUrl.substring(msg.fileUrl.lastIndexOf('/') + 1)).replace(/^[a-f0-9-]{36}-/, '')}
                                                    </p>
                                                    <a
                                                        href={msg.fileUrl}
                                                        download
                                                        className={`text-[11px] font-bold underline transition-colors hover:opacity-80 block mt-0.5 ${
                                                            isOwnMsg ? 'text-[#0D0A0B]/80 hover:text-[#0D0A0B]' : 'text-[#C9A227] hover:text-[#E8D48B]'
                                                        }`}
                                                    >
                                                        {locale === 'ru' ? 'Скачать файл' : 'Download File'}
                                                    </a>
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {/* Date */}
                                    <span className={`text-[9px] mt-1.5 self-end ${
                                        isOwnMsg ? 'text-[#0D0A0B]/60' : 'text-[#F5ECD7]/40'
                                    }`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Upload Progress Overlay */}
            {uploadingFile && (
                <div className="bg-[#0D0A0B] border-t border-[#C9A227]/20 px-6 py-2 flex items-center justify-between text-xs text-[#F5ECD7]/80">
                    <span className="truncate max-w-[200px]">⚡ Загрузка: {uploadingFile.name}</span>
                    <span className="font-mono text-[#C9A227] font-bold">{uploadingFile.progress}%</span>
                </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSend} className="bg-[#0D0A0B] border-t border-[#C9A227]/20 p-4 flex gap-3 items-center">
                {/* File Attachment Button */}
                <label className="p-3 bg-[#1A1517] hover:bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#E8D48B] rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".cdr,.dxf,.ai,.pdf,.eps,.png,.jpg,.jpeg"
                        disabled={isSending || !!uploadingFile}
                    />
                    <span className="text-xl">📎</span>
                </label>

                {/* Text Field */}
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={isSending || !!uploadingFile}
                    className="flex-1 px-4 py-3 bg-[#1A1517] border border-[#C9A227]/30 rounded-xl text-[#F5ECD7] placeholder-[#F5ECD7]/40 focus:ring-1 focus:ring-[#C9A227] focus:border-[#C9A227] transition-all text-sm outline-none"
                    placeholder={locale === 'ru' ? 'Введите сообщение...' : 'Type a message...'}
                />

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSending || (!text.trim() && !uploadingFile) || !!uploadingFile}
                    className="px-5 py-3 bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] font-bold rounded-xl shadow-sm hover:shadow-[0_0_15px_rgba(201,162,39,0.4)] transition-all disabled:opacity-50 transform active:translate-y-0.5 text-sm"
                >
                    {locale === 'ru' ? 'Отправить' : 'Send'}
                </button>
            </form>
        </div>
    );
}
