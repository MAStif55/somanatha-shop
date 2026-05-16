import { NextRequest, NextResponse } from 'next/server';

const OZON_API_BASE = 'https://api-seller.ozon.ru';

// Human-readable status mapping
const STATUS_MAP: Record<string, { label: string; labelEn: string; color: string; emoji: string }> = {
    awaiting_registration:  { label: 'Ожидает регистрации',  labelEn: 'Awaiting Registration',  color: '#9ca3af', emoji: '🕐' },
    acceptance_in_progress: { label: 'Идёт приёмка',          labelEn: 'Acceptance in Progress', color: '#6366f1', emoji: '📋' },
    awaiting_approve:       { label: 'Ожидает подтверждения', labelEn: 'Awaiting Approval',      color: '#f59e0b', emoji: '⏳' },
    awaiting_packaging:     { label: 'Ожидает сборки',        labelEn: 'Awaiting Packaging',     color: '#eab308', emoji: '⏳' },
    awaiting_deliver:       { label: 'Готов к отгрузке',      labelEn: 'Awaiting Delivery',      color: '#3b82f6', emoji: '📦' },
    arbitration:            { label: 'Арбитраж',              labelEn: 'Arbitration',             color: '#f97316', emoji: '⚠️' },
    client_arbitration:     { label: 'Арбитраж клиента',      labelEn: 'Client Arbitration',     color: '#f97316', emoji: '⚠️' },
    delivering:             { label: 'Доставляется',          labelEn: 'Delivering',              color: '#6366f1', emoji: '🚚' },
    driver_pickup:          { label: 'У водителя',            labelEn: 'Driver Pickup',           color: '#8b5cf6', emoji: '🚗' },
    delivered:              { label: 'Доставлен',             labelEn: 'Delivered',                color: '#22c55e', emoji: '✅' },
    cancelled:              { label: 'Отменён',               labelEn: 'Cancelled',                color: '#ef4444', emoji: '❌' },
    not_accepted:           { label: 'Не принят',             labelEn: 'Not Accepted',             color: '#dc2626', emoji: '🚫' },
    sent_by_seller:         { label: 'Отправлен продавцом',   labelEn: 'Sent by Seller',           color: '#0ea5e9', emoji: '📮' },
};

function getStatusInfo(status: string) {
    return STATUS_MAP[status] || {
        label: status,
        labelEn: status,
        color: '#9ca3af',
        emoji: '❓',
    };
}

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
    const status = searchParams.get('status') || '';
    const days = parseInt(searchParams.get('days') || '30', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // Calculate date range
    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const body: Record<string, unknown> = {
        dir: 'DESC',
        filter: {
            since: since.toISOString(),
            to: now.toISOString(),
            ...(status && status !== 'all' ? { status } : {}),
        },
        limit,
        offset,
        with: {
            analytics_data: false,
            barcodes: false,
            financial_data: true,
            translit: false,
        },
    };

    try {
        const response = await fetch(`${OZON_API_BASE}/v3/posting/fbs/list`, {
            method: 'POST',
            headers: {
                'Client-Id': clientId,
                'Api-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ozon API error:', response.status, errorText);
            return NextResponse.json(
                { error: `Ozon API returned ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        const postings = data.result?.postings || [];
        const hasNext = data.result?.has_next || false;

        // Collect all unique offer_ids to fetch barcodes
        const offerIds = new Set<string>();
        postings.forEach((posting: any) => {
            (posting.products || []).forEach((p: any) => {
                if (p.offer_id) offerIds.add(p.offer_id);
            });
        });

        // Fetch product info to get barcodes
        const barcodeMap: Record<string, string> = {};
        if (offerIds.size > 0) {
            try {
                const infoRes = await fetch(`${OZON_API_BASE}/v3/product/info/list`, {
                    method: 'POST',
                    headers: {
                        'Client-Id': clientId,
                        'Api-Key': apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ offer_id: Array.from(offerIds) }),
                });
                if (infoRes.ok) {
                    const infoData = await infoRes.json();
                    if (infoData.items) {
                        infoData.items.forEach((item: any) => {
                            if (item.offer_id && item.barcodes && item.barcodes.length > 0) {
                                barcodeMap[item.offer_id] = item.barcodes[0];
                            }
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch product barcodes', err);
            }
        }

        // Transform postings into a simplified format
        const orders = postings.map((posting: any) => {
            const statusInfo = getStatusInfo(posting.status);
            const products = (posting.products || []).map((p: any) => ({
                name: p.name,
                sku: p.sku,
                quantity: p.quantity,
                offerId: p.offer_id,
                price: p.price,
                currencyCode: p.currency_code,
                barcode: barcodeMap[p.offer_id] || null,
            }));

            // Calculate total from product prices
            const total = products.reduce(
                (sum: number, p: any) => sum + (parseFloat(p.price) || 0) * (p.quantity || 1),
                0
            );

            // Extract payout (what seller receives) and commission from financial_data
            let payout = 0;
            let commissionAmount = 0;
            let commissionPercent = 0;
            if (posting.financial_data?.products && posting.financial_data.products.length > 0) {
                payout = posting.financial_data.products.reduce(
                    (sum: number, fp: any) => sum + (parseFloat(fp.payout) || 0),
                    0
                );
                commissionAmount = posting.financial_data.products.reduce(
                    (sum: number, fp: any) => sum + (parseFloat(fp.commission_amount) || 0),
                    0
                );
                // Average commission percent
                const percents = posting.financial_data.products
                    .map((fp: any) => parseFloat(fp.commission_percent) || 0)
                    .filter((p: number) => p > 0);
                commissionPercent = percents.length > 0
                    ? percents.reduce((a: number, b: number) => a + b, 0) / percents.length
                    : 0;
            }

            return {
                postingNumber: posting.posting_number,
                orderId: posting.order_id,
                orderNumber: posting.order_number,
                status: posting.status,
                statusLabel: statusInfo.label,
                statusLabelEn: statusInfo.labelEn,
                statusColor: statusInfo.color,
                statusEmoji: statusInfo.emoji,
                createdAt: posting.created_at,
                inProcessAt: posting.in_process_at,
                shipmentDate: posting.shipment_date,
                deliveringDate: posting.delivering_date,
                products,
                total,
                payout,
                commissionAmount,
                commissionPercent,
                // Delivery info
                deliveryMethod: posting.delivery_method ? {
                    name: posting.delivery_method.name,
                    warehouse: posting.delivery_method.warehouse,
                    warehouseId: posting.delivery_method.warehouse_id,
                    tplProvider: posting.delivery_method.tpl_provider,
                } : null,
                // Addressee
                addressee: posting.addressee ? {
                    name: posting.addressee.name,
                    phone: posting.addressee.phone,
                } : null,
                // Customer info (if available)
                customer: posting.customer ? {
                    name: posting.customer.name?.first_name
                        ? `${posting.customer.name.first_name} ${posting.customer.name.last_name || ''}`.trim()
                        : null,
                    phone: posting.customer.phone,
                    address: posting.customer.address
                        ? `${posting.customer.address.city || ''}, ${posting.customer.address.address_tail || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '')
                        : null,
                    city: posting.customer.address?.city || null,
                } : null,
                // Cancellation
                cancellation: posting.cancellation ? {
                    cancellationReasonId: posting.cancellation.cancel_reason_id,
                    cancellationReason: posting.cancellation.cancel_reason,
                    cancellationType: posting.cancellation.cancellation_type,
                    cancelledAfterShip: posting.cancellation.cancelled_after_ship,
                } : null,
            };
        });

        return NextResponse.json({
            orders,
            hasNext,
            total: orders.length,
            offset,
            limit,
        });
    } catch (error: any) {
        console.error('Ozon API fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch Ozon orders', details: error.message },
            { status: 500 }
        );
    }
}
