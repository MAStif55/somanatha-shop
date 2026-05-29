import { NextResponse } from 'next/server';
import { PromoRepository } from '../../../../../lib/data';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        
        const updates: any = {};
        if (body.code !== undefined) updates.code = body.code.trim().toUpperCase();
        if (body.type !== undefined) updates.type = body.type;
        if (body.value !== undefined) updates.value = Number(body.value);
        if (body.minOrderAmount !== undefined) updates.minOrderAmount = body.minOrderAmount ? Number(body.minOrderAmount) : null;
        if (body.maxUses !== undefined) updates.maxUses = body.maxUses ? Number(body.maxUses) : null;
        if (body.validFrom !== undefined) updates.validFrom = body.validFrom ? new Date(body.validFrom).getTime() : null;
        if (body.validUntil !== undefined) updates.validUntil = body.validUntil ? new Date(body.validUntil).getTime() : null;
        if (body.isActive !== undefined) updates.isActive = body.isActive;

        await PromoRepository.updatePromo(params.id, updates);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error updating promo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        await PromoRepository.deletePromo(params.id);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error deleting promo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
