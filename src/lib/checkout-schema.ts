import { z } from 'zod';

/**
 * Checkout Form Validation Schema
 * 
 * Uses Zod for type-safe validation with localized error messages.
 * Customize the fields and validation rules for your project.
 */

// Russian phone number regex: +7 or 8 followed by 10 digits
const phoneRegex = /^(\+7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;

export const checkoutSchema = z.object({
    customerName: z
        .string()
        .min(2, { message: 'Name must be at least 2 characters' })
        .max(100, { message: 'Name must be less than 100 characters' }),
    email: z
        .string()
        .email({ message: 'Please enter a valid email address' }),
    phone: z
        .string()
        .regex(phoneRegex, { message: 'Please enter a valid phone number (+7 or 8 format)' }),
    address: z
        .string()
        .min(10, { message: 'Address must be at least 10 characters' })
        .max(500, { message: 'Address must be less than 500 characters' }),
    telegram: z
        .string()
        .optional()
        .refine(
            (val) => !val || val.startsWith('@') || val.length === 0,
            { message: 'Telegram username should start with @' }
        ),
    notes: z
        .string()
        .max(1000, { message: 'Note must be less than 1000 characters' })
        .optional(),
    addressDetails: z.any().optional(),
    paymentMethod: z.enum(['card', 'bank_transfer'], {
        message: 'Please select a payment method',
    }),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

/**
 * Get localized validation schema
 * 
 * Returns a Zod schema with error messages in the specified locale.
 */
export const getLocalizedSchema = (locale: 'en' | 'ru') => {
    const messages = {
        en: {
            nameMin: 'Name must be at least 2 characters',
            nameMax: 'Name must be less than 100 characters',
            emailInvalid: 'Please enter a valid email address',
            phoneInvalid: 'Please enter a valid phone number (+7 or 8 format)',
            addressMin: 'Address must be at least 10 characters',
            addressMax: 'Address must be less than 500 characters',
            telegramFormat: 'Telegram username should start with @',
        },
        ru: {
            nameMin: 'Имя должно содержать минимум 2 символа',
            nameMax: 'Имя должно быть менее 100 символов',
            emailInvalid: 'Введите корректный email адрес',
            phoneInvalid: 'Введите корректный номер телефона (+7 или 8)',
            addressMin: 'Адрес должен содержать минимум 10 символов',
            addressMax: 'Адрес должен быть менее 500 символов',
            telegramFormat: 'Telegram никнейм должен начинаться с @',
        },
    };

    const m = messages[locale];

    return z.object({
        customerName: z
            .string()
            .min(2, { message: m.nameMin })
            .max(100, { message: m.nameMax }),
        email: z
            .string()
            .email({ message: m.emailInvalid }),
        phone: z
            .string()
            .regex(phoneRegex, { message: m.phoneInvalid }),
        address: z
            .string()
            .min(10, { message: m.addressMin })
            .max(500, { message: m.addressMax }),
        telegram: z
            .string()
            .optional()
            .refine(
                (val) => !val || val.startsWith('@') || val.length === 0,
                { message: m.telegramFormat }
            ),
        notes: z
            .string()
            .max(1000, { message: locale === 'ru' ? 'Комментарий слишком длинный' : 'Note is too long' })
            .optional(),
        addressDetails: z.any().optional(),
        paymentMethod: z.enum(['card', 'bank_transfer'], {
            message: locale === 'ru' ? 'Выберите способ оплаты' : 'Please select a payment method',
        }),
    });
};
