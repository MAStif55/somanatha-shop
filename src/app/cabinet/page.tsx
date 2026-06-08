import { getCustomerSession } from '@/actions/customer-auth-actions';
import { getDb } from '@/lib/data/yandex/mongo-client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginForm from '@/components/cabinet/LoginForm';
import LogoutButton from '@/components/cabinet/LogoutButton';
import Link from 'next/link';
import { formatPrice } from '@/utils/currency';

interface DbOrder {
    _id: any;
    customerName: string;
    email: string;
    total: number;
    status: string;
    paymentStatus?: string;
    createdAt: number;
}

// Function to map DB order status to Russian/English label and CSS class
function getStatusDetails(status: string, paymentStatus?: string, locale: string = 'ru') {
    const isPaid = paymentStatus === 'paid';
    
    if (isPaid && status === 'pending') {
        return {
            label: locale === 'ru' ? 'Оплачен, в очереди на работу' : 'Paid, queued for work',
            className: 'bg-green-500/10 text-green-400 border border-green-500/30'
        };
    }

    if (paymentStatus === 'awaiting_transfer') {
        return {
            label: locale === 'ru' ? 'Ожидает оплаты' : 'Awaiting Payment',
            className: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
        };
    }

    switch (status) {
        case 'pending':
            return {
                label: locale === 'ru' ? 'На проверке мастером' : 'Under Master Review',
                className: 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
            };
        case 'completed':
            return {
                label: locale === 'ru' ? 'Выполнен' : 'Completed',
                className: 'bg-green-500/10 text-green-400 border border-green-500/30'
            };
        case 'cancelled':
            return {
                label: locale === 'ru' ? 'Отменен' : 'Cancelled',
                className: 'bg-red-500/10 text-red-400 border border-red-500/30'
            };
        case 'archived':
            return {
                label: locale === 'ru' ? 'В архиве' : 'Archived',
                className: 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
            };
        default:
            return {
                label: status,
                className: 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
            };
    }
}

export default async function CabinetPage({ searchParams }: { searchParams: { error?: string; email?: string } }) {
    const session = await getCustomerSession();
    const errorParam = searchParams.error;
    const emailParam = searchParams.email;
    
    let orders: DbOrder[] = [];
    let dbError = '';

    if (session) {
        try {
            const db = await getDb();
            orders = (await db.collection('orders')
                .find({ email: { $regex: new RegExp(`^${session.email.trim()}$`, 'i') } })
                .sort({ createdAt: -1 })
                .toArray()) as unknown as DbOrder[];
        } catch (err) {
            console.error('[Cabinet] Error fetching orders:', err);
            dbError = 'Не удалось загрузить историю заказов. Попробуйте обновить страницу.';
        }
    }

    return (
        <main className="min-h-screen flex flex-col bg-[#0D0A0B]">
            <Header />

            <section className="flex-1 py-12 px-6 flex flex-col items-center justify-center">
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
                    <div className="max-w-4xl w-full">
                        {/* Cabinet Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#C9A227]/20 pb-6 mb-8 gap-4">
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

                        {/* Orders List */}
                        <h2 className="text-xl font-bold text-[#E8D48B] mb-4">
                            Ваши Заказы
                        </h2>

                        {orders.length === 0 ? (
                            <div className="bg-[#1A1517]/80 border border-[#C9A227]/20 rounded-2xl p-12 text-center text-[#F5ECD7]/60 space-y-4 shadow-[0_0_30px_rgba(201,162,39,0.05)] backdrop-blur-sm">
                                <span className="text-5xl">📦</span>
                                <p className="text-lg">У вас пока нет оформленных заказов.</p>
                                <Link
                                    href="/#catalog"
                                    className="inline-block bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] px-6 py-2.5 rounded-lg font-bold hover:shadow-[0_0_20px_rgba(201,162,39,0.4)] transition-all text-sm uppercase tracking-wider transform hover:-translate-y-0.5"
                                >
                                    Перейти в каталог
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => {
                                    const orderIdStr = order._id.toString();
                                    const displayId = orderIdStr.slice(-8).toUpperCase();
                                    const statusDetails = getStatusDetails(order.status, order.paymentStatus);
                                    
                                    return (
                                        <div
                                            key={orderIdStr}
                                            className="bg-[#1A1517]/80 border border-[#C9A227]/20 hover:border-[#C9A227]/50 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(201,162,39,0.1)] backdrop-blur-sm"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="text-lg font-mono font-bold text-[#E8D48B] tracking-wider">
                                                        #{displayId}
                                                    </span>
                                                    <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${statusDetails.className}`}>
                                                        {statusDetails.label}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-[#F5ECD7]/60 flex gap-4">
                                                    <span>
                                                        Создан: {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                                                    </span>
                                                    <span>
                                                        Сумма: <strong className="text-[#C9A227]">{formatPrice(order.total)}</strong>
                                                    </span>
                                                </div>
                                            </div>

                                            <Link
                                                href={`/orders/${orderIdStr}`}
                                                className="w-full md:w-auto text-center px-5 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#8B7D4B] text-[#0D0A0B] font-bold rounded-lg shadow-md hover:shadow-[0_0_15px_rgba(201,162,39,0.3)] transition-all transform hover:-translate-y-0.5 text-sm"
                                            >
                                                Обсудить и отслеживать 💬
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </section>

            <Footer />
        </main>
    );
}
