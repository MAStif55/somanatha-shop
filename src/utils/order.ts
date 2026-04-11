const VALID_CONTACT_METHODS = ['telegram', 'max', 'phone_call', 'sms', 'email'];
const PHONE_REGEX = /^(\+7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateOrder(data: any): string | null {
    if (!data.customerName || typeof data.customerName !== 'string') return 'Invalid name';
    if (data.customerName.length < 2 || data.customerName.length > 100) return 'Name must be 2–100 characters';
    if (!data.email || !EMAIL_REGEX.test(data.email)) return 'Invalid email';
    if (!data.phone || !PHONE_REGEX.test(data.phone)) return 'Invalid phone number';
    if (!data.address || typeof data.address !== 'string') return 'Invalid address';
    if (data.address.length < 10 || data.address.length > 500) return 'Address must be 10–500 characters';
    if (data.notes && typeof data.notes === 'string' && data.notes.length > 1000) {
        return 'Notes must be under 1000 characters';
    }
    if (!['card', 'bank_transfer'].includes(data.paymentMethod)) return 'Invalid payment method';

    const cp = data.contactPreferences;
    if (cp) {
        if (!cp.methods || !Array.isArray(cp.methods) || cp.methods.length === 0) {
            return 'Select at least one contact method';
        }
        for (const method of cp.methods) {
            if (!VALID_CONTACT_METHODS.includes(method)) {
                return `Invalid contact method: ${method}`;
            }
        }
        if (cp.methods.includes('telegram')) {
            if (!cp.telegramHandle || typeof cp.telegramHandle !== 'string' || cp.telegramHandle.trim() === '') {
                return 'Telegram handle is required';
            }
            if (!cp.telegramHandle.startsWith('@')) {
                return 'Telegram handle must start with @';
            }
        }
        if (cp.methods.includes('max')) {
            if (!cp.maxId || typeof cp.maxId !== 'string' || cp.maxId.trim() === '') {
                return 'MAX ID is required';
            }
        }
    }

    return null;
}

export function serializeProductTitle(title: any): string {
    if (!title) return '';
    if (typeof title === 'string') return title;
    if (typeof title === 'object' && title !== null) {
        return title.ru || title.en || JSON.stringify(title);
    }
    return String(title);
}

export function calculateGiftDiscount(items: any[]): number {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const freeItemCount = Math.floor(totalItems / 11);
    if (freeItemCount === 0) return 0;

    const units: number[] = [];
    items.forEach((item) => {
        for (let i = 0; i < item.quantity; i++) {
            units.push(item.price);
        }
    });

    units.sort((a, b) => a - b);

    let discount = 0;
    for (let i = 0; i < freeItemCount; i++) {
        discount += units[i];
    }
    return discount;
}
