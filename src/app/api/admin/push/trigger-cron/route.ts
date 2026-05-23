import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const port = process.env.PORT || 3000;
        const headers: Record<string, string> = {};
        
        if (process.env.CRON_SECRET) {
            headers['Authorization'] = `Bearer ${process.env.CRON_SECRET}`;
        }
        
        // Вызываем внутренний эндпоинт крона с параметром force=true
        const res = await fetch(`http://127.0.0.1:${port}/api/push/cron?force=true`, {
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
