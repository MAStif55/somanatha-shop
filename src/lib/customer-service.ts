import { OrderRepository } from '@/lib/data';
import { Order } from '@/types/order';
import { Customer } from '@/types/customer';

export async function getCustomers(): Promise<Customer[]> {
    const orders = await OrderRepository.getAll();
    // We will build a list of profiles.
    // For each order, we find matching profiles.
    // If multiple match, we merge them.
    // If one matches, we update it.
    // If none, we create new.
    let profiles: Customer[] = [];

    orders.forEach((order: Order) => {
        // Find all profiles that match this order
        const matchingIndices: number[] = [];

        profiles.forEach((p, index) => {
            let matches = false;
            // Match Email (case insensitive)
            if (order.email && p.email && order.email.toLowerCase() === p.email.toLowerCase()) matches = true;
            // Match Phone (exact)
            else if (order.phone && p.phone && order.phone === p.phone) matches = true;
            // Match Telegram (case insensitive, remove @)
            else if (order.telegram && p.telegram) {
                const orderTg = order.telegram.replace('@', '').toLowerCase();
                const profileTg = p.telegram.replace('@', '').toLowerCase();
                if (orderTg === profileTg) matches = true;
            }

            if (matches) matchingIndices.push(index);
        });

        if (matchingIndices.length === 0) {
            // New Customer
            const newCustomer: Customer = {
                id: order.email || order.phone || `anon-${Math.random().toString(36).substr(2, 9)}`,
                email: order.email,
                phone: order.phone,
                telegram: order.telegram,
                name: order.customerName,
                totalSpent: order.total,
                orderCount: 1,
                lastOrderDate: order.createdAt,
                firstOrderDate: order.createdAt,
                notes: ''
            };
            profiles.push(newCustomer);
        } else if (matchingIndices.length === 1) {
            // Update existing
            const index = matchingIndices[0];
            const p = profiles[index];

            p.totalSpent += order.total;
            p.orderCount += 1;

            // Merge contact info if missing
            if (!p.email && order.email) p.email = order.email;
            if (!p.phone && order.phone) p.phone = order.phone;
            if (!p.telegram && order.telegram) p.telegram = order.telegram;

            // Prefer newest name if not empty
            // if (order.customerName) p.name = order.customerName; 

            if (order.createdAt > p.lastOrderDate) p.lastOrderDate = order.createdAt;
            if (order.createdAt < p.firstOrderDate) p.firstOrderDate = order.createdAt;
        } else {
            // MERGE multiple profiles
            // We take the first matched profile as base
            const baseIndex = matchingIndices[0];
            const baseProfile = profiles[baseIndex];

            // Merge stats from other matched profiles
            for (let i = 1; i < matchingIndices.length; i++) {
                const otherIndex = matchingIndices[i];
                const otherProfile = profiles[otherIndex];

                baseProfile.totalSpent += otherProfile.totalSpent;
                baseProfile.orderCount += otherProfile.orderCount;

                // Merge data
                if (!baseProfile.email && otherProfile.email) baseProfile.email = otherProfile.email;
                if (!baseProfile.phone && otherProfile.phone) baseProfile.phone = otherProfile.phone;
                if (!baseProfile.telegram && otherProfile.telegram) baseProfile.telegram = otherProfile.telegram;

                if (otherProfile.lastOrderDate > baseProfile.lastOrderDate) baseProfile.lastOrderDate = otherProfile.lastOrderDate;
                if (otherProfile.firstOrderDate < baseProfile.firstOrderDate) baseProfile.firstOrderDate = otherProfile.firstOrderDate;
            }

            // Remove merged profiles (iterate backwards to avoid index shift issues, but here we just made a new list or filter)
            // Easier: Filter out indices 1..N
            profiles = profiles.filter((_, idx) => !matchingIndices.slice(1).includes(idx));

            // Now update the base profile with current order
            baseProfile.totalSpent += order.total;
            baseProfile.orderCount += 1;

            if (!baseProfile.email && order.email) baseProfile.email = order.email;
            if (!baseProfile.phone && order.phone) baseProfile.phone = order.phone;
            if (!baseProfile.telegram && order.telegram) baseProfile.telegram = order.telegram;

            if (order.createdAt > baseProfile.lastOrderDate) baseProfile.lastOrderDate = order.createdAt;
            if (order.createdAt < baseProfile.firstOrderDate) baseProfile.firstOrderDate = order.createdAt;
        }
    });

    return profiles.sort((a, b) => b.lastOrderDate - a.lastOrderDate);
}

// Since aggregation changes ID generation, we need to match carefully.
// The ID passed here is from `getCustomers`.
// But to find orders, we need to match any of the contact fields of that customer.
// We can't rely on 'email' logic alone anymore.
export async function getCustomerOrders(
    identifier: string,
    preloadedCustomer?: Customer
): Promise<Order[]> {
    // Use the preloaded customer if provided, otherwise re-derive from all orders
    const customer = preloadedCustomer
        ?? (await getCustomers()).find((c: Customer) => c.id === identifier);

    if (!customer) return [];

    const allOrders = await OrderRepository.getAll();

    return allOrders.filter((o: Order) => {
        let match = false;
        if (customer.email && o.email && customer.email.toLowerCase() === o.email.toLowerCase()) match = true;
        if (customer.phone && o.phone && customer.phone === o.phone) match = true;
        if (customer.telegram && o.telegram) {
            const t1 = customer.telegram.replace('@', '').toLowerCase();
            const t2 = o.telegram.replace('@', '').toLowerCase();
            if (t1 === t2) match = true;
        }
        return match;
    }).sort((a: Order, b: Order) => b.createdAt - a.createdAt);
}
