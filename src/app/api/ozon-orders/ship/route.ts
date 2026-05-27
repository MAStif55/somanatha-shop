import { NextRequest, NextResponse } from 'next/server';

const OZON_API_BASE = 'https://api-seller.ozon.ru';

export async function POST(request: NextRequest) {
    const clientId = process.env.OZON_CLIENT_ID;
    const apiKey = process.env.OZON_API_KEY;

    if (!clientId || !apiKey) {
        return NextResponse.json(
            { error: 'Ozon API credentials not configured' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { posting_number, products } = body;

        if (!posting_number || !products || !Array.isArray(products)) {
            return NextResponse.json(
                { error: 'Missing required fields: posting_number or products' },
                { status: 400 }
            );
        }

        // Assemble all products into a single package
        const payload = {
            packages: [
                {
                    products: products.map((p: any) => ({
                        product_id: p.sku,
                        quantity: p.quantity,
                    })),
                },
            ],
            posting_number,
            with: {
                additional_data: false,
            },
        };

        const response = await fetch(`${OZON_API_BASE}/v4/posting/fbs/ship`, {
            method: 'POST',
            headers: {
                'Client-Id': clientId,
                'Api-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ozon ship error:', response.status, errorText);
            return NextResponse.json(
                { error: `Ozon API returned ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Ozon API ship error:', error);
        return NextResponse.json(
            { error: 'Failed to ship Ozon order', details: error.message },
            { status: 500 }
        );
    }
}
