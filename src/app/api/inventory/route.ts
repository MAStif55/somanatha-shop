import { NextRequest, NextResponse } from 'next/server';
import { InventoryRepository } from '@/lib/data';

// Add basic security (for example, require an admin secret if needed, or rely on middleware)

import { ProductRepository } from '@/lib/data';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const includeSiteProducts = url.searchParams.get('includeSiteProducts') === 'true';

        const items = await InventoryRepository.getAll();
        
        if (includeSiteProducts) {
            // Fetch all products from site and merge
            const products = await ProductRepository.getAll();
            const existingOfferIds = new Set(items.map(i => i.offerId));
            
            for (const p of products) {
                // Assume slug is the default offerId if it doesn't exist in inventory yet
                if (!existingOfferIds.has(p.slug)) {
                    items.push({
                        offerId: p.slug,
                        name: p.title.ru || p.title.en || p.slug,
                        stock: 0
                    });
                    existingOfferIds.add(p.slug);
                }
            }
        }

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
