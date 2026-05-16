import { NextRequest, NextResponse } from 'next/server';
import { ProductRepository } from '@/lib/data';

export async function GET(req: NextRequest) {
    try {
        const products = await ProductRepository.getAll();
        
        // Return minimal info for mapping
        const minProducts = products.map(p => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            ozonOfferId: p.ozonOfferId
        }));
        
        return NextResponse.json(minProducts);
    } catch (error: any) {
        console.error('Products fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
