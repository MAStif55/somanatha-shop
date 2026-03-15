export interface Customer {
    id: string; // usually email or normalized phone
    email: string;
    phone?: string;
    telegram?: string;
    name: string;
    totalSpent: number;
    orderCount: number;
    lastOrderDate: number;
    firstOrderDate: number;
    notes?: string; // Manager notes for this customer
}
