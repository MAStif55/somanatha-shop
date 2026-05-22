import { NextResponse } from 'next/server';
import { PushRepository } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const stats = await PushRepository.getStats();
        const campaigns = await PushRepository.getRecentCampaigns(15);

        return NextResponse.json({
            success: true,
            stats,
            campaigns
        });
    } catch (error) {
        console.error('[API Admin Stats] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
