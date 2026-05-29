import { NextResponse } from 'next/server';
import { PromoRepository } from '../../../../lib/data';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { code, cartTotal } = body;

        if (!code) {
            return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
        }

        const promo = await PromoRepository.getPromoByCode(code);

        if (!promo) {
            return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 });
        }

        if (!promo.isActive) {
            return NextResponse.json({ error: 'Промокод не активен' }, { status: 400 });
        }

        const now = Date.now();
        if (promo.validFrom && now < promo.validFrom) {
            return NextResponse.json({ error: 'Срок действия промокода еще не начался' }, { status: 400 });
        }

        if (promo.validUntil && now > promo.validUntil) {
            return NextResponse.json({ error: 'Срок действия промокода истек' }, { status: 400 });
        }

        if (promo.maxUses && promo.usesCount >= promo.maxUses) {
            return NextResponse.json({ error: 'Промокод больше не действителен (превышен лимит)' }, { status: 400 });
        }

        if (promo.minOrderAmount && cartTotal < promo.minOrderAmount) {
            return NextResponse.json({ error: `Минимальная сумма заказа для этого промокода: ${promo.minOrderAmount}₽` }, { status: 400 });
        }

        return NextResponse.json({ promo }, { status: 200 });

    } catch (error) {
        console.error('Error applying promo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
