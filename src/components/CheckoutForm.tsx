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
    const { items, clearCart, getFinalPrice } = useCartStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

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

    const onSubmit = async (data: CheckoutFormData) => {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const response = await fetch(API.CREATE_ORDER, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cartItems: items,
                    customerInfo: data,
                    locale,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit order');
            }

            if (result.success && result.paymentUrl) {
                window.location.href = result.paymentUrl;
            } else if (result.success) {
                router.push(`/order-success?orderId=${result.orderId}&method=bank_transfer`);
            }
        } catch (error) {
            console.error('Checkout error:', error);
            setSubmitError(
                locale === 'ru'
                    ? 'Произошла ошибка при оформлении заказа. Попробуйте позже.'
                    : 'An error occurred while placing your order. Please try again later.'
            );
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
                disabled={isSubmitting || items.length === 0}
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
