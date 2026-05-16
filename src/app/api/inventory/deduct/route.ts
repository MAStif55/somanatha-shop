import { NextRequest, NextResponse } from 'next/server';
import { InventoryRepository } from '@/lib/data';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { offerId, name, quantity } = body;
        
        if (!offerId || !quantity) {
            return NextResponse.json({ error: 'Missing offerId or quantity' }, { status: 400 });
        }

        const success = await InventoryRepository.deductStock(offerId, name || '', Number(quantity));
        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Недостаточно товара в наличии' }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
