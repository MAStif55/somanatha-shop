'use client';

import { useState, useEffect } from 'react';
import { PromoCode, PromoType } from '../../../types/promo';
import { Plus, Trash2, Edit2, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminPromosPage() {
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'manual' | 'bday' | 'ozon'>('manual');
    
    const getFilteredPromos = () => {
        if (activeTab === 'manual') return promos.filter(p => !p.code.startsWith('BDAY-') && !p.code.startsWith('OZON-'));
        if (activeTab === 'bday') return promos.filter(p => p.code.startsWith('BDAY-'));
        if (activeTab === 'ozon') return promos.filter(p => p.code.startsWith('OZON-'));
        return promos;
    };
    
    const filteredPromos = getFilteredPromos();
    
    // Form state
    const [formData, setFormData] = useState<Partial<PromoCode>>({
        code: '',
        type: 'percentage',
        value: 10,
        isActive: true
    });

    useEffect(() => {
        fetchPromos();
    }, []);

    const fetchPromos = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/promos');
            const data = await res.json();
            if (data.promos) setPromos(data.promos);
        } catch (error) {
            console.error('Failed to fetch promos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/promos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsFormOpen(false);
                fetchPromos();
                setFormData({ code: '', type: 'percentage', value: 10, isActive: true });
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create promo');
            }
        } catch (error) {
            console.error(error);
            alert('Error creating promo');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this promo code?')) return;
        try {
            const res = await fetch(`/api/admin/promos/${id}`, { method: 'DELETE' });
            if (res.ok) fetchPromos();
        } catch (error) {
            console.error(error);
        }
    };

    const toggleStatus = async (promo: PromoCode) => {
        try {
            const res = await fetch(`/api/admin/promos/${promo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !promo.isActive })
            });
            if (res.ok) fetchPromos();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Управление Промокодами</h1>
                <button 
                    onClick={() => setIsFormOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                    <Plus size={20} /> Создать промокод
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8 border">
                    <h2 className="text-xl font-bold mb-4">Новый промокод</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Код</label>
                            <input 
                                required
                                type="text"
                                className="w-full border p-2 rounded"
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Тип скидки</label>
                            <select 
                                className="w-full border p-2 rounded"
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value as PromoType})}
                            >
                                <option value="percentage">Процент (%)</option>
                                <option value="fixed_amount">Сумма (₽)</option>
                                <option value="free_shipping">Бесплатная доставка</option>
                            </select>
                        </div>
                        {formData.type !== 'free_shipping' && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Значение скидки</label>
                                <input 
                                    required
                                    type="number"
                                    min="1"
                                    className="w-full border p-2 rounded"
                                    value={formData.value}
                                    onChange={e => setFormData({...formData, value: Number(e.target.value)})}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium mb-1">Мин. сумма заказа (₽)</label>
                            <input 
                                type="number"
                                min="0"
                                className="w-full border p-2 rounded"
                                value={formData.minOrderAmount || ''}
                                onChange={e => setFormData({...formData, minOrderAmount: Number(e.target.value)})}
                                placeholder="Без ограничений"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Лимит использований</label>
                            <input 
                                type="number"
                                min="1"
                                className="w-full border p-2 rounded"
                                value={formData.maxUses || ''}
                                onChange={e => setFormData({...formData, maxUses: Number(e.target.value)})}
                                placeholder="Без ограничений"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                            <button 
                                type="button" 
                                onClick={() => setIsFormOpen(false)}
                                className="px-4 py-2 border rounded"
                            >
                                Отмена
                            </button>
                            <button 
                                type="submit"
                                className="px-4 py-2 bg-green-600 text-white rounded"
                            >
                                Сохранить
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div>Загрузка...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'manual' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Основные промокоды
                        </button>
                        <button
                            onClick={() => setActiveTab('bday')}
                            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'bday' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Дни Рождения
                        </button>
                        <button
                            onClick={() => setActiveTab('ozon')}
                            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'ozon' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Ozon (Купоны)
                        </button>
                    </div>

                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4">Код</th>
                                <th className="p-4">Тип</th>
                                <th className="p-4">Скидка</th>
                                <th className="p-4">Использовано</th>
                                <th className="p-4">Статус</th>
                                <th className="p-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPromos.map(promo => (
                                <tr key={promo.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-bold">{promo.code}</td>
                                    <td className="p-4">
                                        {promo.type === 'percentage' && 'Процент'}
                                        {promo.type === 'fixed_amount' && 'Сумма'}
                                        {promo.type === 'free_shipping' && 'Доставка'}
                                    </td>
                                    <td className="p-4">
                                        {promo.type === 'percentage' && `${promo.value}%`}
                                        {promo.type === 'fixed_amount' && `${promo.value} ₽`}
                                        {promo.type === 'free_shipping' && '-'}
                                    </td>
                                    <td className="p-4">
                                        {promo.usesCount} {promo.maxUses ? `/ ${promo.maxUses}` : ''}
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => toggleStatus(promo)}
                                            className={`flex items-center gap-1 text-sm px-2 py-1 rounded-full ${promo.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                        >
                                            {promo.isActive ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                            {promo.isActive ? 'Активен' : 'Отключен'}
                                        </button>
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        <button onClick={() => handleDelete(promo.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredPromos.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        {activeTab === 'manual' ? 'Основные промокоды пока не созданы' : 'Сгенерированных промокодов пока нет'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
