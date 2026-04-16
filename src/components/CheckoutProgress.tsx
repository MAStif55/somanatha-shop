'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { User, Truck, CreditCard, Check } from 'lucide-react';

interface CheckoutProgressProps {
    /** 1 = Data, 2 = Delivery, 3 = Payment */
    currentStep: number;
}

const STEPS = [
    { labelKey: 'data', icon: User },
    { labelKey: 'delivery', icon: Truck },
    { labelKey: 'payment', icon: CreditCard },
] as const;

const LABELS: Record<string, Record<string, string>> = {
    data: { ru: 'Данные', en: 'Details' },
    delivery: { ru: 'Доставка', en: 'Delivery' },
    payment: { ru: 'Оплата', en: 'Payment' },
};

export default function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
    const { locale } = useLanguage();

    return (
        <div className="flex items-center justify-center gap-0 mb-8 sm:mb-10 select-none">
            {STEPS.map((step, idx) => {
                const stepNum = idx + 1;
                const isCompleted = currentStep > stepNum;
                const isActive = currentStep === stepNum;
                const Icon = isCompleted ? Check : step.icon;

                return (
                    <div key={step.labelKey} className="flex items-center">
                        {/* Step circle + label */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                                    isCompleted
                                        ? 'bg-green-600/80 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                        : isActive
                                            ? 'bg-[#C9A227]/20 border-[#C9A227] text-[#E8D48B] shadow-[0_0_15px_rgba(201,162,39,0.3)]'
                                            : 'bg-[#1A1517] border-[#C9A227]/20 text-[#F5ECD7]/30'
                                }`}
                            >
                                <Icon size={18} strokeWidth={isCompleted ? 3 : 2} />
                            </div>
                            <span
                                className={`text-[10px] sm:text-xs mt-1.5 font-medium tracking-wide transition-colors ${
                                    isCompleted
                                        ? 'text-green-400'
                                        : isActive
                                            ? 'text-[#E8D48B]'
                                            : 'text-[#F5ECD7]/30'
                                }`}
                            >
                                {LABELS[step.labelKey][locale]}
                            </span>
                        </div>

                        {/* Connector line */}
                        {idx < STEPS.length - 1 && (
                            <div className="w-12 sm:w-20 h-0.5 mx-2 sm:mx-3 -mt-5 rounded-full overflow-hidden bg-[#C9A227]/10">
                                <div
                                    className={`h-full transition-all duration-500 rounded-full ${
                                        currentStep > stepNum
                                            ? 'bg-green-500 w-full'
                                            : currentStep === stepNum
                                                ? 'bg-gradient-to-r from-[#C9A227] to-transparent w-1/2'
                                                : 'w-0'
                                    }`}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
