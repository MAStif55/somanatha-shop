'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCartStore } from '@/store/cart-store';
import { getLocalizedSchema, CheckoutFormData } from '@/lib/checkout-schema';
import { AddressAutocomplete } from './AddressAutocomplete';
import { formatPrice } from '@/utils/currency';
import { API } from '@/lib/config';

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
        formState: { errors },
    } = useForm<CheckoutFormData>({
        resolver: zodResolver(schema),
    });

    const addressValue = watch('address') || '';
    const paymentMethodValue = watch('paymentMethod');

    const handleAddressChange = (value: string) => {
        setValue('address', value, { shouldValidate: true });
    };

    const handleAddressSelect = (suggestion: any) => {
        // Save full structured data
        setValue('addressDetails', suggestion.data);

        // You might want to auto-fill zip code if available, but for now we just save the struct
        // suggestion.data.postal_code could be useful
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
                // Card payment: redirect to YooKassa payment page
                window.location.href = result.paymentUrl;
            } else if (result.success) {
                // Bank transfer: go to order success page
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

            {/* Address */}
            <div>
                <label className="block text-sm font-medium text-[#E8D48B] mb-2">
                    {locale === 'ru' ? 'Адрес доставки' : 'Delivery Address'}
                </label>
                <AddressAutocomplete
                    value={addressValue}
                    onChange={handleAddressChange}
                    onSelect={handleAddressSelect}
                    error={errors.address?.message}
                    locale={locale}
                    placeholder={locale === 'ru' ? 'г. Москва, ул. Пушкина, д. 1, кв. 10' : '123 Main St, New York, NY'}
                />

            </div>

            {/* Telegram (Optional) */}
            <div>
                <label className="block text-sm font-medium text-[#E8D48B] mb-2">
                    Telegram <span className="text-[#F5ECD7]/50 font-normal">({locale === 'ru' ? 'необязательно' : 'optional'})</span>
                </label>
                <input
                    type="text"
                    {...register('telegram')}
                    className="w-full px-4 py-3 bg-[#0D0A0B] border border-[#C9A227]/30 rounded-lg text-[#F5ECD7] placeholder-[#F5ECD7]/40 focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition-colors"
                    placeholder="@username"
                />
                {errors.telegram && (
                    <p className="text-red-400 text-sm mt-1">{errors.telegram.message}</p>
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
