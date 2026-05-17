import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OZON_API_BASE = 'https://api-seller.ozon.ru';

export async function GET(request: NextRequest) {
    const clientId = process.env.OZON_CLIENT_ID;
    const apiKey = process.env.OZON_API_KEY;

    if (!clientId || !apiKey) {
        return NextResponse.json(
            { error: 'Ozon API credentials not configured' },
            { status: 500 }
        );
    }

    try {
        let offerIds: string[] = [];
        let lastId = '';

        // Step 1: Get list of products with pagination (up to 1000 per request)
        do {
            const listRes = await fetch(`${OZON_API_BASE}/v3/product/list`, {
                method: 'POST',
                headers: {
                    'Client-Id': clientId,
                    'Api-Key': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filter: { visibility: "ALL" },
                    limit: 1000,
                    last_id: lastId
                }),
            });

            if (!listRes.ok) {
                const errText = await listRes.text();
                throw new Error(`Failed to fetch product list: ${errText}`);
            }

            const listData = await listRes.json();
            const currentIds = (listData.result?.items || []).map((i: any) => i.offer_id).filter(Boolean);
            offerIds.push(...currentIds);
            
            lastId = listData.result?.last_id || '';
        } while (lastId);

        if (offerIds.length === 0) {
            return NextResponse.json([]);
        }

        // Step 2: Get product info (names) in chunks of 1000
        const products = [];
        
        for (let i = 0; i < offerIds.length; i += 1000) {
            const chunk = offerIds.slice(i, i + 1000);
            
            const infoRes = await fetch(`${OZON_API_BASE}/v3/product/info/list`, {
                method: 'POST',
                headers: {
                    'Client-Id': clientId,
                    'Api-Key': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ offer_id: chunk }),
            });

            if (!infoRes.ok) {
                const errText = await infoRes.text();
                throw new Error(`Failed to fetch product info: ${errText}`);
            }

            const infoData = await infoRes.json();
            const chunkProducts = (infoData.result?.items || infoData.items || []).map((item: any) => ({
                offerId: item.offer_id,
                name: item.name,
                sku: item.sku,
                barcode: item.barcodes?.[0] || null,
            }));
            
            products.push(...chunkProducts);
        }

        return NextResponse.json(products);
    } catch (error: any) {
        console.error('Ozon products error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
