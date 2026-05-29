import { NextResponse } from 'next/server';
import { PromoRepository } from '../../../../lib/data';
import { PromoCode } from '../../../../types/promo';
import { v4 as uuidv4 } from 'uuid';

// Check auth using existing admin methods if necessary
// (Assuming standard Next.js route protection or middleware applies)

export async function GET() {
    try {
        const promos = await PromoRepository.getPromos();
        return NextResponse.json({ promos }, { status: 200 });
    } catch (error) {
        console.error('Error fetching promos:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const newPromo: PromoCode = {
            id: uuidv4(),
            code: body.code.trim().toUpperCase(),
            type: body.type,
            value: Number(body.value),
            minOrderAmount: body.minOrderAmount ? Number(body.minOrderAmount) : undefined,
            maxUses: body.maxUses ? Number(body.maxUses) : undefined,
            usesCount: 0,
            validFrom: body.validFrom ? new Date(body.validFrom).getTime() : undefined,
            validUntil: body.validUntil ? new Date(body.validUntil).getTime() : undefined,
            isActive: body.isActive !== undefined ? body.isActive : true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await PromoRepository.createPromo(newPromo);
        return NextResponse.json({ promo: newPromo }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating promo:', error);
        if (error.message && error.message.includes('already exists')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
