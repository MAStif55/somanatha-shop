import { NextResponse } from 'next/server';
import { PromoRepository } from '@/lib/data';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
    try {
        // Generate a 6-character random suffix for the Ozon code
        const uniqueCode = `OZON-${randomUUID().substring(0, 6).toUpperCase()}`;
        const now = Date.now();
        
        await PromoRepository.createPromo({
            id: randomUUID(),
            code: uniqueCode,
            type: 'percentage',
            value: 15, // 15% discount default
            isActive: true,
            maxUses: 1, // Single use only
            usesCount: 0,
            validFrom: now,
            validUntil: now + 30 * 24 * 60 * 60 * 1000, // Valid for 30 days
            createdAt: now,
            updatedAt: now
        });

        return NextResponse.json({ success: true, code: uniqueCode });
    } catch (error: any) {
        console.error('Failed to generate promo slip:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
