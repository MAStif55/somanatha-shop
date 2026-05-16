import { NextRequest, NextResponse } from 'next/server';

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

    const { searchParams } = new URL(request.url);
    const postingNumber = searchParams.get('posting');

    if (!postingNumber) {
        return NextResponse.json(
            { error: 'Missing posting number' },
            { status: 400 }
        );
    }

    const headers = {
        'Client-Id': clientId,
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
    };

    try {
        // Step 1: Create label generation task
        const createRes = await fetch(`${OZON_API_BASE}/v2/posting/fbs/package-label/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ posting_number: [postingNumber] }),
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            console.error('Ozon label create error:', createRes.status, errText);
            // If create fails, try direct fetch (label may already exist)
        }

        // Wait a moment for label generation
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Get the label PDF
        const labelRes = await fetch(`${OZON_API_BASE}/v1/posting/fbs/package-label/get`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ posting_number: [postingNumber] }),
        });

        if (!labelRes.ok) {
            // Fallback: try the older endpoint
            const fallbackRes = await fetch(`${OZON_API_BASE}/v2/posting/fbs/package-label`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ posting_number: [postingNumber] }),
            });

            if (!fallbackRes.ok) {
                const errText = await fallbackRes.text();
                console.error('Ozon label fallback error:', fallbackRes.status, errText);
                return NextResponse.json(
                    { error: `Ozon returned ${fallbackRes.status}. Этикетка может быть ещё не готова — попробуйте через минуту.`, details: errText },
                    { status: fallbackRes.status }
                );
            }

            // Return PDF from fallback
            const pdfBuffer = await fallbackRes.arrayBuffer();
            return new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="label-${postingNumber}.pdf"`,
                },
            });
        }

        // Return PDF
        const pdfBuffer = await labelRes.arrayBuffer();
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="label-${postingNumber}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('Ozon label fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch label', details: error.message },
            { status: 500 }
        );
    }
}
