import { NextRequest, NextResponse } from 'next/server';
import { InventoryRepository } from '@/lib/data';

// Add basic security (for example, require an admin secret if needed, or rely on middleware)

export async function GET(req: NextRequest) {
    try {
        const items = await InventoryRepository.getAll();
        return NextResponse.json(items);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { offerId, name, stock } = body;
        
        if (!offerId || stock === undefined) {
            return NextResponse.json({ error: 'Missing offerId or stock' }, { status: 400 });
        }

        await InventoryRepository.setStock(offerId, name || '', Number(stock));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
