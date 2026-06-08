'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCartStore } from '@/store/cart-store';
import { getLocalizedSchema, CheckoutFormData } from '@/lib/checkout-schema';
import { AddressAutocomplete } from './AddressAutocomplete';
import CheckoutProgress from './CheckoutProgress';
import { formatPrice } from '@/utils/currency';
import { API } from '@/lib/config';

interface UploadingFile {
    name: string;
    progress: number;
    url?: string;
    error?: string;
}

declare global {
    interface Window {
        onloadTurnstileCallback?: () => void;
        turnstile?: {
            render: (container: string | HTMLElement, options: any) => string;
            remove: (widgetId: string) => void;
            reset: (widgetId: string) => void;
        };
    }
}

const CONTACT_METHODS = [
    { id: 'telegram', icon: '💬', labelKey: 'method_telegram' },
    { id: 'max', icon: '📲', labelKey: 'method_max' },
    { id: 'phone_call', icon: '📞', labelKey: 'method_phone_call' },
    { id: 'sms', icon: '📱', labelKey: 'method_sms' },
    { id: 'email', icon: '📧', labelKey: 'method_email' },
] as const;

const DELIVERY_OPTIONS = [
    { id: 'pickup_ozon', icon: '📦' },
    { id: 'pickup_yandex', icon: '📦' },
    { id: 'home_address', icon: '🏠' },
] as const;

export default function CheckoutForm() {
    const { locale, t } = useLanguage();
    const router = useRouter();
    const { items, clearCart, getFinalPrice, appliedPromo } = useCartStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Draft Order ID to keep uploads grouped in S3
    const [tempId] = useState(() => Math.random().toString(36).substring(2, 11) + Date.now().toString(36));

    // S3 Attachments State
    const [attachments, setAttachments] = useState<UploadingFile[]>([]);
    const [uploadingCount, setUploadingCount] = useState(0);

    // Turnstile CAPTCHA State
    const [captchaToken, setCaptchaToken] = useState<string>('');
    const turnstileRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const schema = getLocalizedSchema(locale);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm<CheckoutFormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            contactPreferences: {
                methods: [],
                telegramHandle: '',
                maxId: '',
            },
        },
    });

    const addressValue = watch('address') || '';
    const paymentMethodValue = watch('paymentMethod');
    const deliveryTypeValue = watch('deliveryType');
    const customerNameValue = watch('customerName') || '';
    const emailValue = watch('email') || '';
    const phoneValue = watch('phone') || '';
    const selectedMethods = useWatch({ control, name: 'contactPreferences.methods' }) || [];

    // Compute checkout progress step
    const getCheckoutStep = (): number => {
        const step1Done = customerNameValue.trim().length > 0 && emailValue.trim().length > 0 && phoneValue.trim().length > 0;
        const step2Done = step1Done && !!deliveryTypeValue && addressValue.trim().length > 0;
        if (step2Done && paymentMethodValue) return 3;
        if (step1Done) return 2;
        return 1;
    };
    const checkoutStep = getCheckoutStep();

    // #10: Reset address when delivery type changes
    const prevDeliveryType = useRef(deliveryTypeValue);
    useEffect(() => {
        if (prevDeliveryType.current && prevDeliveryType.current !== deliveryTypeValue) {
            setValue('address', '', { shouldValidate: false });
            setValue('addressDetails', undefined);
        }
        prevDeliveryType.current = deliveryTypeValue;
    }, [deliveryTypeValue, setValue]);

    const handleAddressChange = (value: string) => {
        setValue('address', value, { shouldValidate: true });
    };

    const handleAddressSelect = (suggestion: any) => {
        setValue('addressDetails', suggestion.data);
    };

    const toggleMethod = (methodId: string) => {
        const current = selectedMethods as string[];
        const updated = current.includes(methodId)
            ? current.filter((m: string) => m !== methodId)
            : [...current, methodId];
        setValue('contactPreferences.methods', updated as any, { shouldValidate: true });
    };

    // Load Turnstile script dynamically
    useEffect(() => {
        const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // Demo key fallback
        const scriptId = 'cf-turnstile-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        const initializeTurnstile = () => {
            if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
                try {
                    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
                        sitekey: siteKey,
                        callback: (token: string) => {
                            setCaptchaToken(token);
                        },
                        'error-callback': (err: any) => {
                            console.error('Turnstile error:', err);
                        }
                    });
                } catch (e) {
                    console.error('Failed to render Turnstile:', e);
                }
            }
        };

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);

            window.onloadTurnstileCallback = () => {
                initializeTurnstile();
            };
        } else if (window.turnstile) {
            initializeTurnstile();
        }

        return () => {
            if (window.turnstile && widgetIdRef.current) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                    widgetIdRef.current = null;
                } catch (e) {}
            }
        };
    }, []);

    // File Upload Handler (Direct S3 uploads via Presigned URLs)
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const allowedExtensions = ['.cdr', '.dxf', '.ai', '.pdf', '.eps', '.png', '.jpg', '.jpeg'];
        const maxSizeBytes = 50 * 1024 * 1024; // 50MB

        const fileList = Array.from(files);

        for (const file of fileList) {
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                alert(
                    locale === 'ru'
                        ? `Неподдерживаемый формат файла: ${file.name}. Разрешены только: ${allowedExtensions.join(', ')}`
                        : `Unsupported file format: ${file.name}. Only: ${allowedExtensions.join(', ')} are allowed.`
                );
                continue;
            }

            if (file.size > maxSizeBytes) {
                alert(
                    locale === 'ru'
                        ? `Файл ${file.name} слишком большой. Максимальный размер: 50 МБ`
                        : `File ${file.name} is too large. Max size is 50MB`
                );
                continue;
            }

            // Add to state
            const newFile: UploadingFile = { name: file.name, progress: 0 };
            setAttachments(prev => [...prev, newFile]);
            setUploadingCount(prev => prev + 1);

            try {
                // 1. Get Presigned URL from backend
                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileType: file.type,
                        tempId,
                    }),
                });

                const uploadData = await uploadResponse.json();
                if (!uploadResponse.ok || !uploadData.success) {
                    throw new Error(uploadData.error || 'Failed to get upload URL');
                }

                const { uploadUrl, publicUrl } = uploadData;

                // 2. Upload file directly to Yandex Object Storage (S3) via XMLHttpRequest for progress tracking
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl);
                xhr.setRequestHeader('Content-Type', file.type);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setAttachments(prev =>
                            prev.map(item => item.name === file.name ? { ...item, progress: percent } : item)
                        );
                    }
                };

                xhr.onload = () => {
                    setUploadingCount(prev => Math.max(0, prev - 1));
                    if (xhr.status === 200) {
                        setAttachments(prev =>
                            prev.map(item => item.name === file.name ? { ...item, url: publicUrl, progress: 100 } : item)
                        );
                    } else {
                        setAttachments(prev =>
                            prev.map(item => item.name === file.name ? { ...item, error: 'Upload failed', progress: 0 } : item)
                        );
                    }
                };

                xhr.onerror = () => {
                    setUploadingCount(prev => Math.max(0, prev - 1));
                    setAttachments(prev =>
                        prev.map(item => item.name === file.name ? { ...item, error: 'Network error', progress: 0 } : item)
                    );
                };

                xhr.send(file);
            } catch (err: any) {
                console.error('File upload error:', err);
                setUploadingCount(prev => Math.max(0, prev - 1));
                setAttachments(prev =>
                    prev.map(item => item.name === file.name ? { ...item, error: err.message || 'Upload failed', progress: 0 } : item)
                );
            }
        }
    };

    const removeAttachment = (fileName: string) => {
        setAttachments(prev => prev.filter(item => item.name !== fileName));
    };

    const onSubmit = async (data: CheckoutFormData) => {
        if (uploadingCount > 0) {
            alert(
                locale === 'ru'
                    ? 'Пожалуйста, дождитесь окончания загрузки всех файлов.'
                    : 'Please wait until all files are uploaded.'
            );
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const uploadedUrls = attachments.filter(a => a.url).map(a => a.url as string);

            const payload = {
                cartItems: items,
                customerInfo: {
                    ...data,
                    attachments: uploadedUrls,
                    captchaToken,
                },
                locale,
                promoCode: appliedPromo ? appliedPromo.code : null,
            };

            const response = await fetch(API.CREATE_ORDER, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                // Reset captcha on failure to let them try again
                if (window.turnstile && widgetIdRef.current) {
                    window.turnstile.reset(widgetIdRef.current);
                }
                throw new Error(result.error || 'Failed to submit order');
            }

            if (result.success && result.paymentUrl) {
                window.location.href = result.paymentUrl;
            } else if (result.success) {
                router.push(`/order-success?orderId=${result.orderId}&method=bank_transfer`);
            }
        } catch (error: any) {
            console.error('Checkout error:', error);
            setSubmitError(error.message || (
                locale === 'ru'
                    ? 'Произошла ошибка при оформлении заказа. Попробуйте позже.'
                    : 'An error occurred while placing your order. Please try again later.'
            ));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Progress Indicator */}
            <CheckoutProgress currentStep={checkoutStep} />

            {/* Customer Name */}
            <div>
                <label className="block text-sm font-medium text-[#E8D48B] mb-2">
                    {locale === 'ru' ? 'Ваше имя' : 'Your Name'}
                </label>
                <input
                    type="text"
                    {...register('customerName')}
                    className="w-full px-4 py-3 bg-[#0D0A0B] border border-[#C9A227]/30 rounded-lg text-[#F5ECD7] placeholder-[#F5ECD7]/40 focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition-colors"
                    placeholder={locale === 'ru' ? 'Иван Иванов' : 'John Doe'}
                />
                {errors.customerName && (
                    <p className="text-red-400 text-sm mt-1">{errors.customerName.message}</p>
                )}
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm font-medium text-[#E8D48B] mb-2">
                    Email
                </label>
                <input
                    type="email"
                    {...register('email')}
                    className="w-full px-4 py-3 bg-[#0D0A0B] border border-[#C9A227]/30 rounded-lg text-[#F5ECD7] placeholder-[#F5ECD7]/40 focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition-colors"
                    placeholder="example@mail.com"
                />
                {errors.email && (
                    <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
                )}
            </div>

            {/* Phone */}
            <div>
                <label className="block text-sm font-medium text-[#E8D48B] mb-2">
                    {locale === 'ru' ? 'Телефон' : 'Phone'}
                </label>
                <input
                    type="tel"
                    {...register('phone')}
                    className="w-full px-4 py-3 bg-[#0D0A0B] border border-[#C9A227]/30 rounded-lg text-[#F5ECD7] placeholder-[#F5ECD7]/40 focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition-colors"
                    placeholder="+7 999 000-00-00"
                />
                {errors.phone && (
                    <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>
                )}
            </div>

            {/* Delivery Type with nested address input */}
            <div>
                <label className="block text-sm font-medium text-[#E8D48B] mb-1">
                    {t('checkout.deliveryTypeLabel')}
                </label>
                <p className="text-xs text-[#F5ECD7]/50 mb-3">
                    {t('checkout.deliveryTypeHint')}
                </p>
                <div className="space-y-2">
                    {DELIVERY_OPTIONS.map((option) => {
                        const isSelected = deliveryTypeValue === option.id;
                        const placeholder = option.id === 'home_address'
                            ? (locale === 'ru' ? 'г. Москва, ул. Пушкина, д. 1, кв. 10' : '123 Main St, New York, NY')
                            : (locale === 'ru' ? 'Начните вводить адрес пункта выдачи...' : 'Start typing pickup point address...');
                        return (
                            <div key={option.id}>
                                <label
                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                                        ? 'bg-[#C9A227]/10 border-[#C9A227]/60 shadow-[0_0_12px_rgba(201,162,39,0.15)] ring-1 ring-[#C9A227]'
                                        : 'bg-[#0D0A0B] border-[#C9A227]/20 hover:border-[#C9A227]/40'
                                        } ${isSelected ? 'rounded-b-none border-b-0' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        value={option.id}
                                        {...register('deliveryType')}
                                        className="w-4 h-4 accent-[#C9A227]"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{option.icon}</span>
                                            <span className="font-medium text-[#E8D48B]">
                                                {t(`checkout.deliveryType_${option.id}`)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#F5ECD7]/50 mt-1">
                                            {t(`checkout.deliveryType_${option.id}_desc`)}
                                        </p>
                                    </div>
                                </label>
                                <div
                                    className="grid transition-[grid-template-rows] duration-250 ease-out"
                                    style={{ gridTemplateRows: isSelected ? '1fr' : '0fr' }}
                                >
                                    <div className="overflow-hidden min-h-0">
                                        <div className={`px-4 pb-4 pt-3 bg-[#C9A227]/10 border border-t-0 border-[#C9A227]/60 rounded-b-xl ring-1 ring-[#C9A227] transition-opacity duration-250 ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                                            <label className="block text-xs font-medium text-[#E8D48B]/80 mb-1.5">
                                                {option.id === 'home_address'
                                                    ? (locale === 'ru' ? 'Адрес доставки' : 'Delivery Address')
                                                    : (locale === 'ru' ? 'Адрес пункта выдачи' : 'Pickup Point Address')}
                                            </label>
                                            <AddressAutocomplete
                                                value={isSelected ? addressValue : ''}
                                                onChange={handleAddressChange}
                                                onSelect={handleAddressSelect}
                                                error={isSelected ? errors.address?.message : undefined}
                                                locale={locale}
                                                placeholder={placeholder}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {errors.deliveryType && (
                    <p className="text-red-400 text-sm mt-2">{errors.deliveryType.message}</p>
                )}
            </div>

            {/* Preferred Contact Methods */}
            <div>
                <label className="block text-sm font-medium text-[#E8D48B] mb-1">
                    {t('checkout.contactMethods')}
                </label>
                <p className="text-xs text-[#F5ECD7]/50 mb-3">
                    {t('checkout.contactMethodsHint')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CONTACT_METHODS.map((method) => {
                        const isSelected = (selectedMethods as string[]).includes(method.id);
                        return (
                            <button
                                key={method.id}
                                type="button"
                                onClick={() => toggleMethod(method.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                                    isSelected
                                        ? 'bg-[#C9A227]/15 border-[#C9A227]/60 text-[#E8D48B] ring-1 ring-[#C9A227]/40 shadow-[0_0_8px_rgba(201,162,39,0.1)]'
                                        : 'bg-[#0D0A0B] border-[#C9A227]/20 text-[#F5ECD7]/60 hover:border-[#C9A227]/40 hover:text-[#F5ECD7]/80'
                                }`}
                            >
                                <span className="text-base">{method.icon}</span>
                                <span>{t(`checkout.${method.labelKey}`)}</span>
                                {isSelected && (
                                    <svg className="w-4 h-4 ml-auto text-[#C9A227]" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
                {errors.contactPreferences?.methods && (
                    <p className="text-red-400 text-sm mt-2">{errors.contactPreferences.methods.message}</p>
                )}

                {/* Conditional: Telegram Handle */}
                {(selectedMethods as string[]).includes('telegram') && (
                    <div className="mt-3 animate-in slide-in-from-top-1 duration-200">
                        <label className="block text-xs font-medium text-[#E8D48B]/80 mb-1">
                            {t('checkout.telegramHandle')}
                        </label>
                        <input
                            type="text"
                            {...register('contactPreferences.telegramHandle')}
                            className="w-full px-4 py-2.5 bg-[#0D0A0B] border border-[#C9A227]/30 rounded-lg text-[#F5ECD7] placeholder-[#F5ECD7]/40 focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition-colors text-sm"
                            placeholder="@username"
                        />
                        {errors.contactPreferences?.telegramHandle && (
                            <p className="text-red-400 text-xs mt-1">{errors.contactPreferences.telegramHandle.message}</p>
                        )}
                    </div>
                )}

                {/* Conditional: MAX ID */}
                {(selectedMethods as string[]).includes('max') && (
                    <div className="mt-3 animate-in slide-in-from-top-1 duration-200">
                        <label className="block text-xs font-medium text-[#E8D48B]/80 mb-1">
                            {t('checkout.maxId')}
                        </label>
                        <input
                            type="text"
                            {...register('contactPreferences.maxId')}
                            className="w-full px-4 py-2.5 bg-[#0D0A0B] border border-[#C9A227]/30 rounded-lg text-[#F5ECD7] placeholder-[#F5ECD7]/40 focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition-colors text-sm"
                            placeholder={locale === 'ru' ? 'ID или номер телефона' : 'ID or phone number'}
                        />
                        {errors.contactPreferences?.maxId && (
                            <p className="text-red-400 text-xs mt-1">{errors.contactPreferences.maxId.message}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Layout Attachment Upload Field */}
            <div>
                <label className="block text-sm font-medium text-[#E8D48B] mb-2">
                    {locale === 'ru' ? 'Макеты для гравировки / Референсы' : 'Engraving Layouts / References'}
                </label>
                <div className="w-full border-2 border-dashed border-[#C9A227]/30 rounded-lg bg-[#0D0A0B]/50 p-6 text-center hover:border-[#C9A227] hover:bg-[#C9A227]/5 transition-colors relative shadow-sm">
                    <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".cdr,.dxf,.ai,.pdf,.eps,.png,.jpg,.jpeg"
                    />
                    <div className="space-y-1 pointer-events-none">
                        <span className="text-3xl">📁</span>
                        <p className="text-[#F5ECD7] font-medium">
                            {locale === 'ru' ? 'Выберите или перетащите файлы' : 'Choose or drag files here'}
                        </p>
                        <p className="text-xs text-[#F5ECD7]/60">
                            {locale === 'ru' ? 'Разрешены: .cdr, .dxf, .ai, .pdf, .eps, .png, .jpg (до 50 МБ)' : 'Allowed: .cdr, .dxf, .ai, .pdf, .eps, .png, .jpg (up to 50MB)'}
                        </p>
                    </div>
                </div>

                {/* Uploading Progress & Files List */}
                {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {attachments.map((file, idx) => (
                            <div key={file.name + idx} className="flex items-center justify-between p-3 bg-[#1A1517] border border-[#C9A227]/20 rounded-lg shadow-sm backdrop-blur-sm animate-fade-in">
                                <div className="flex-1 mr-4">
                                    <div className="flex justify-between items-center text-sm font-semibold text-[#E8D48B] mb-1">
                                        <span className="truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                                        <span className="text-xs font-mono text-[#C9A227]">
                                            {file.error ? (
                                                <span className="text-red-400">{file.error}</span>
                                            ) : (
                                                `${file.progress}%`
                                            )}
                                        </span>
                                    </div>
                                    {!file.error && file.progress < 100 && (
                                        <div className="w-full bg-[#0D0A0B] h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-[#C9A227] to-[#E8D48B] h-full transition-all duration-300"
                                                style={{ width: `${file.progress}%` }}
                                            ></div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeAttachment(file.name)}
                                    className="text-red-400/80 hover:text-red-400 text-sm p-1 ml-2 transition-colors"
                                >
                                    ❌
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Notes (Optional) */}
            <div>
                <label className="block text-sm font-medium text-[#E8D48B] mb-2">
                    {locale === 'ru' ? 'Комментарий к заказу' : 'Order Notes'} <span className="text-[#F5ECD7]/50 font-normal">({locale === 'ru' ? 'необязательно' : 'optional'})</span>
                </label>
                <textarea
                    {...register('notes')}
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0D0A0B] border border-[#C9A227]/30 rounded-lg text-[#F5ECD7] placeholder-[#F5ECD7]/40 focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition-colors resize-none"
                    placeholder={locale === 'ru' ? 'Ваши пожелания или уточнения...' : 'Any special instructions...'}
                />
                {errors.notes && (
                    <p className="text-red-400 text-sm mt-1">{errors.notes.message}</p>
                )}
            </div>

            {/* Payment Method */}
            <div>
                <label className="block text-sm font-medium text-[#E8D48B] mb-3">
                    {locale === 'ru' ? 'Способ оплаты' : 'Payment Method'}
                </label>
                <div className="space-y-3">
                    {/* Card Payment Option */}
                    <label
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${paymentMethodValue === 'card'
                            ? 'bg-[#C9A227]/10 border-[#C9A227]/60 shadow-[0_0_12px_rgba(201,162,39,0.15)] ring-1 ring-[#C9A227]'
                            : 'bg-[#0D0A0B] border-[#C9A227]/20 hover:border-[#C9A227]/40'
                            }`}
                    >
                        <input
                            type="radio"
                            value="card"
                            {...register('paymentMethod')}
                            className="w-4 h-4 accent-[#C9A227]"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">💳</span>
                                <span className="font-medium text-[#E8D48B]">
                                    {locale === 'ru' ? 'Оплата картой (ЮKassa)' : 'Card Payment (YooKassa)'}
                                </span>
                            </div>
                            <p className="text-xs text-[#F5ECD7]/50 mt-1">
                                {locale === 'ru' ? 'Visa, Mastercard, МИР' : 'Visa, Mastercard, MIR'}
                            </p>
                            {paymentMethodValue === 'card' && (
                                <div className="mt-2 text-xs text-[#C9A227] bg-[#C9A227]/10 p-2 rounded border border-[#C9A227]/20">
                                    {locale === 'ru'
                                        ? 'Внимание: при оплате картой взимается комиссия сервиса +3.5%'
                                        : 'Note: A +3.5% service fee is applied for card payments'}
                                </div>
                            )}
                        </div>
                    </label>

                    {/* Bank Transfer Option */}
                    <label
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${paymentMethodValue === 'bank_transfer'
                            ? 'bg-[#C9A227]/10 border-[#C9A227]/60 shadow-[0_0_12px_rgba(201,162,39,0.15)] ring-1 ring-[#C9A227]'
                            : 'bg-[#0D0A0B] border-[#C9A227]/20 hover:border-[#C9A227]/40'
                            }`}
                    >
                        <input
                            type="radio"
                            value="bank_transfer"
                            {...register('paymentMethod')}
                            className="w-4 h-4 accent-[#C9A227]"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🏦</span>
                                <span className="font-medium text-[#E8D48B]">
                                    {locale === 'ru' ? 'Перевод по реквизитам' : 'Bank Transfer'}
                                </span>
                            </div>
                            <p className="text-xs text-[#F5ECD7]/50 mt-1">
                                {locale === 'ru' ? 'Без комиссии. Менеджер свяжется для оплаты.' : 'No fee. Manager will contact regarding payment.'}
                            </p>
                        </div>
                    </label>
                </div>
                {errors.paymentMethod && (
                    <p className="text-red-400 text-sm mt-2">{errors.paymentMethod.message}</p>
                )}
            </div>

            {/* Turnstile Captcha Container */}
            <div className="flex justify-center my-4">
                <div ref={turnstileRef} id="cf-turnstile-container"></div>
            </div>

            {/* Error Message */}
            {submitError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
                    {submitError}
                </div>
            )}

            {/* Total Display */}
            <div className="flex justify-between items-center p-4 bg-[#1A1517] rounded-xl border border-[#C9A227]/20">
                <span className="text-[#F5ECD7]/70 text-sm">
                    {paymentMethodValue === 'card'
                        ? (locale === 'ru' ? 'Итого к оплате (с комиссией):' : 'Total to pay (with fee):')
                        : (locale === 'ru' ? 'Итого к оплате:' : 'Total to pay:')}
                </span>
                <span className="text-xl font-bold text-[#E8D48B] text-glow-gold">
                    {(() => {
                        const finalPrice = getFinalPrice();
                        if (paymentMethodValue === 'card') {
                            const fee = finalPrice * 0.035;
                            const totalWithFee = finalPrice + fee;
                            return formatPrice(totalWithFee);
                        }
                        return formatPrice(finalPrice);
                    })()}
                </span>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting || items.length === 0 || uploadingCount > 0}
                className="w-full bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] py-4 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(201,162,39,0.4)] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
            >
                {isSubmitting
                    ? (locale === 'ru' ? 'Обработка...' : 'Processing...')
                    : paymentMethodValue === 'card'
                        ? (locale === 'ru' ? 'Перейти к оплате' : 'Proceed to Payment')
                        : (locale === 'ru' ? 'Оформить заказ' : 'Place Order')}
            </button>
        </form>
    );
}
