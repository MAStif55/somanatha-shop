import { NextRequest, NextResponse } from 'next/server';
import { ProductRepository } from '@/lib/data';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { productId, ozonOfferId } = body;
        
        if (!productId) {
            return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
        }

        // We update the local product with ozonOfferId
        // ProductRepository.update takes (id, Partial<Product>)
        await ProductRepository.update(productId, { ozonOfferId });
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Ozon map error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
