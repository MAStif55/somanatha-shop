import { getCustomerSession } from '@/actions/customer-auth-actions';
import { getDb } from '@/lib/data/yandex/mongo-client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginForm from '@/components/cabinet/LoginForm';
import LogoutButton from '@/components/cabinet/LogoutButton';
import CabinetDashboard from '@/components/cabinet/CabinetDashboard';
import { Order } from '@/types/order';

export default async function CabinetPage({ searchParams }: { searchParams: { error?: string; email?: string } }) {
    const session = await getCustomerSession();
    const errorParam = searchParams.error;
    const emailParam = searchParams.email;
    
    let orders: Order[] = [];
    let dbError = '';

    if (session) {
        try {
            const db = await getDb();
            const dbOrders = await db.collection('orders')
                .find({ email: { $regex: new RegExp(`^${session.email.trim()}$`, 'i') } })
                .sort({ createdAt: -1 })
                .toArray();
                
            // Map MongoDB _id to standard string id
            orders = dbOrders.map(doc => {
                const { _id, ...rest } = doc;
                return {
                    id: _id.toString(),
                    ...rest
                } as unknown as Order;
            });
        } catch (err) {
            console.error('[Cabinet] Error fetching orders:', err);
            dbError = 'Не удалось загрузить историю заказов. Попробуйте обновить страницу.';
        }
    }

    return (
        <main className="min-h-screen flex flex-col bg-[#0D0A0B]">
            <Header />

            <section className="flex-1 py-8 sm:py-12 px-4 sm:px-6 flex flex-col items-center justify-center">
                {!session ? (
                    <div className="w-full max-w-md space-y-4">
                        {errorParam === 'expired' && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm text-center shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                Ссылка для входа устарела или уже была использована. Запросите новую.
                            </div>
                        )}
                        {errorParam === 'missing_token' && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm text-center shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                Неверный токен авторизации.
                            </div>
                        )}
                        <LoginForm defaultEmail={emailParam} />
                    </div>
                ) : (
                    <div className="max-w-7xl w-full">
                        {/* Cabinet Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#C9A227]/20 pb-6 mb-6 gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-[#E8D48B]">
                                    Личный Кабинет
                                </h1>
                                <p className="text-sm text-[#F5ECD7]/60 mt-1">
                                    Вы вошли как: <strong className="text-[#C9A227]">{session.email}</strong>
                                </p>
                            </div>
                            <LogoutButton />
                        </div>

                        {/* Database Load Error */}
                        {dbError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm mb-6 shadow-sm">
                                {dbError}
                            </div>
                        )}

                        <CabinetDashboard orders={orders} />
                    </div>
                )}
            </section>

            <Footer />
        </main>
    );
}
