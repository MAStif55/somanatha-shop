export interface NotificationTemplate {
    subject: string;
    body: string; // Markdown or simple text
}

export interface StoreSettings {
    shipping: {
        price: number;
        freeThreshold: number; // 0 to disable
        enabled: boolean;
    };
    contact: {
        email: string;
        phone: string;
        telegram: string;
        whatsapp: string;
        instagram: string;
        address: string;
        telegramLink: string;   // Full Telegram URL (e.g. https://t.me/username)
        maxLink: string;        // Full Max messenger URL
    };
    notifications: {
        telegramEnabled: boolean;
        emailEnabled: boolean;
        templates: {
            orderConfirmation: NotificationTemplate;
            shippingUpdate: NotificationTemplate;
        }
    };
}

export const defaultSettings: StoreSettings = {
    shipping: {
        price: 350,
        freeThreshold: 3000,
        enabled: true
    },
    contact: {
        email: 'support@somanatha.com',
        phone: '+66 12 345 6789',
        telegram: '',
        whatsapp: '',
        instagram: '',
        address: 'Koh Phangan, Thailand\nSurat Thani, 84280',
        telegramLink: 'https://t.me/Trubitsina_Elena_Astrolog',
        maxLink: 'https://max.ru/u/f9LHodD0cOIistNNtQFWq4OLPx_ZPYrqvTyLMwLrRY0P9hHA7Zd06uRLwCg',
    },
    notifications: {
        telegramEnabled: true,
        emailEnabled: true,
        templates: {
            orderConfirmation: {
                subject: 'Заказ #{id} оформлен',
                body: 'Спасибо за ваш заказ! Мы свяжемся с вами в ближайшее время.'
            },
            shippingUpdate: {
                subject: 'Заказ #{id} отправлен',
                body: 'Ваш заказ был отправлен. Трек-номер: {tracking}'
            }
        }
    }
};
