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
        freeThreshold: 5000,
        enabled: true
    },
    contact: {
        email: '',
        phone: '',
        telegram: '',
        whatsapp: '',
        instagram: '',
        address: ''
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
