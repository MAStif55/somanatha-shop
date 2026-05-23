export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Запускаем только в основном Node.js процессе, избегая дублирования в Edge-среде
        
        // Предотвращаем множественную регистрацию интервала (актуально для режима разработки HMR)
        if (!(global as any).__cron_registered) {
            (global as any).__cron_registered = true;
            
            console.log('[Cron] Внутренний планировщик запущен (интервал: 1 минута)');
            
            setInterval(async () => {
                try {
                    // Обращаемся к локальному API-эндпоинту рассылки
                    // PM2 обычно запускает Next.js на порту 3000
                    const port = process.env.PORT || 3000;
                    const res = await fetch(`http://127.0.0.1:${port}/api/push/cron`);
                    
                    if (res.ok) {
                        const data = await res.json();
                        if (data.notificationsSent > 0 || data.deadTokensRemoved > 0) {
                            console.log(`[Cron] Рассылка выполнена. Отправлено: ${data.notificationsSent}, Удалено неактивных токенов: ${data.deadTokensRemoved}`);
                        }
                    }
                } catch (error) {
                    // Игнорируем ошибки сети при сборке или перезагрузке, чтобы не спамить в логи
                }
            }, 60 * 1000); // Раз в 1 минуту
        }
    }
}
