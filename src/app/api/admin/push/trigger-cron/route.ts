import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'daily';

        const port = process.env.PORT || 3000;
        const headers: Record<string, string> = {};
        
        if (process.env.CRON_SECRET) {
            headers['Authorization'] = `Bearer ${process.env.CRON_SECRET}`;
        }
        
        const cronUrl = type === 'instant'
            ? `http://127.0.0.1:${port}/api/push/cron?forceInstant=true`
            : `http://127.0.0.1:${port}/api/push/cron?force=true`;

        // Вызываем внутренний эндпоинт крона с соответствующими параметрами
        const res = await fetch(cronUrl, {
            method: 'GET',
            headers
        });
        
        if (!res.ok) {
            const errText = await res.text();
            return NextResponse.json({ 
                success: false, 
                error: `Ошибка вызова крона (статус ${res.status}): ${errText}` 
            }, { status: res.status });
        }
        
        const data = await res.json();
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('[API Trigger Cron Admin] Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Внутренняя ошибка сервера' 
        }, { status: 500 });
    }
}
