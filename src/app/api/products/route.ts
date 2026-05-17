import { NextRequest, NextResponse } from 'next/server';
import { ProductRepository } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const products = await ProductRepository.getAll();
        
        // Return minimal info for mapping
        const minProducts = products.map(p => {
            let img = null;
            if (p.images && p.images.length > 0) {
                const firstImg = p.images[0];
                img = typeof firstImg === 'string' ? firstImg : firstImg.url;
            }
            
            return {
                id: p.id,
                slug: p.slug,
                title: p.title,
                ozonOfferId: p.ozonOfferId,
                image: img
            };
        });
        
        return NextResponse.json(minProducts);
    } catch (error: any) {
        console.error('Products fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
