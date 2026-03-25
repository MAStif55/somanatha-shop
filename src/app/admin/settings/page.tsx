'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { StoreSettings, defaultSettings } from '@/types/settings';
import { getStoreSettings, updateStoreSettings } from '@/lib/settings-service';
import { invalidateSettingsCache } from '@/hooks/useStoreSettings';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { Save, Truck, Mail, Bell, Database, Download } from 'lucide-react';
import { getAllProducts, getAllOrders } from '@/lib/firestore-utils';

export default function AdminSettingsPage() {
    const { t, locale } = useTranslation();
    const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'contact' | 'shipping' | 'notifications' | 'backup'>('contact');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        const data = await getStoreSettings();
        setSettings(data);
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateStoreSettings(settings);
            invalidateSettingsCache();
            alert(locale === 'ru' ? 'Настройки сохранены' : 'Settings saved');
        } catch (error) {
            console.error(error);
            alert(locale === 'ru' ? 'Ошибка сохранения' : 'Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const handleBackup = async () => {
        try {
            const products = await getAllProducts();
            const orders = await getAllOrders();
            const backupData = {
                date: new Date().toISOString(),
                settings,
                products,
                orders
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `somanatha-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Backup failed", error);
            alert("Backup failed to generate");
        }
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <Breadcrumbs />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {locale === 'ru' ? 'Настройки магазина' : 'Store Settings'}
                </h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? (locale === 'ru' ? 'Сохранение...' : 'Saving...') : (locale === 'ru' ? 'Сохранить' : 'Save Changes')}
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 space-y-1">
                    <button
                        onClick={() => setActiveTab('contact')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'contact' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Mail size={18} />
                        {locale === 'ru' ? 'Контакты' : 'Contact Info'}
                    </button>
                    <button
                        onClick={() => setActiveTab('shipping')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'shipping' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Truck size={18} />
                        {locale === 'ru' ? 'Доставка' : 'Shipping'}
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Bell size={18} />
                        {locale === 'ru' ? 'Уведомления' : 'Notifications'}
                    </button>
                    <button
                        onClick={() => setActiveTab('backup')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'backup' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Database size={18} />
                        {locale === 'ru' ? 'Резервное копирование' : 'Backup'}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-xl border shadow-sm p-6">
                    {activeTab === 'contact' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4 text-gray-800">{locale === 'ru' ? 'Контактная информация' : 'Contact Information'}</h2>
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={settings.contact.email}
                                        onChange={e => setSettings({ ...settings, contact: { ...settings.contact, email: e.target.value } })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ru' ? 'Телефон' : 'Phone'}</label>
                                    <input
                                        type="text"
                                        value={settings.contact.phone}
                                        onChange={e => setSettings({ ...settings, contact: { ...settings.contact, phone: e.target.value } })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telegram (@username)</label>
                                    <input
                                        type="text"
                                        value={settings.contact.telegram}
                                        onChange={e => setSettings({ ...settings, contact: { ...settings.contact, telegram: e.target.value } })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ru' ? 'Адрес' : 'Address'}</label>
                                    <textarea
                                        value={settings.contact.address}
                                        onChange={e => setSettings({ ...settings, contact: { ...settings.contact, address: e.target.value } })}
                                        className="w-full p-2 border rounded-lg"
                                        rows={3}
                                    />
                                </div>
                                <div className="pt-4 border-t">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">{locale === 'ru' ? 'Социальные ссылки' : 'Social Links'}</h3>
                                    <div className="grid gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ru' ? 'Ссылка на Telegram' : 'Telegram Link'}</label>
                                            <input
                                                type="url"
                                                value={settings.contact.telegramLink || ''}
                                                onChange={e => setSettings({ ...settings, contact: { ...settings.contact, telegramLink: e.target.value } })}
                                                className="w-full p-2 border rounded-lg"
                                                placeholder="https://t.me/username"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ru' ? 'Ссылка на Max' : 'Max Messenger Link'}</label>
                                            <input
                                                type="url"
                                                value={settings.contact.maxLink || ''}
                                                onChange={e => setSettings({ ...settings, contact: { ...settings.contact, maxLink: e.target.value } })}
                                                className="w-full p-2 border rounded-lg"
                                                placeholder="https://max.ru/u/..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'shipping' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4 text-gray-800">{locale === 'ru' ? 'Настройки доставки' : 'Shipping Settings'}</h2>
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    checked={settings.shipping.enabled}
                                    onChange={e => setSettings({ ...settings, shipping: { ...settings.shipping, enabled: e.target.checked } })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <label className="text-sm font-medium text-gray-700">{locale === 'ru' ? 'Включить доставку' : 'Enable Shipping'}</label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ru' ? 'Стоимость доставки (руб)' : 'Shipping Price (rub)'}</label>
                                    <input
                                        type="number"
                                        value={settings.shipping.price}
                                        onChange={e => setSettings({ ...settings, shipping: { ...settings.shipping, price: Number(e.target.value) } })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ru' ? 'Бесплатно от (руб)' : 'Free Shipping Threshold'}</label>
                                    <input
                                        type="number"
                                        value={settings.shipping.freeThreshold}
                                        onChange={e => setSettings({ ...settings, shipping: { ...settings.shipping, freeThreshold: Number(e.target.value) } })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold mb-4 text-gray-800">{locale === 'ru' ? 'Шаблоны уведомлений' : 'Notification Templates'}</h2>

                            <div className="space-y-4 border-b pb-6">
                                <h3 className="font-medium text-gray-900">{locale === 'ru' ? 'Подтверждение заказа' : 'Order Confirmation'}</h3>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">{locale === 'ru' ? 'Тема' : 'Subject'}</label>
                                    <input
                                        type="text"
                                        value={settings.notifications.templates.orderConfirmation.subject}
                                        onChange={e => setSettings({ ...settings, notifications: { ...settings.notifications, templates: { ...settings.notifications.templates, orderConfirmation: { ...settings.notifications.templates.orderConfirmation, subject: e.target.value } } } })}
                                        className="w-full p-2 border rounded-lg text-sm text-gray-800 placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">{locale === 'ru' ? 'Текст сообщения' : 'Body'}</label>
                                    <textarea
                                        value={settings.notifications.templates.orderConfirmation.body}
                                        onChange={e => setSettings({ ...settings, notifications: { ...settings.notifications, templates: { ...settings.notifications.templates, orderConfirmation: { ...settings.notifications.templates.orderConfirmation, body: e.target.value } } } })}
                                        className="w-full p-2 border rounded-lg text-sm font-mono text-gray-800 placeholder:text-gray-400"
                                        rows={4}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Variables: {'{id}'}, {'{total}'}, {'{name}'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h3 className="font-semibold text-amber-800 mb-2">{locale === 'ru' ? 'Резервное копирование' : 'Data Backup'}</h3>
                                <p className="text-sm text-amber-700 mb-4">
                                    {locale === 'ru'
                                        ? 'Скачайте полную копию базы данных (товары, заказы, настройки) в формате JSON.'
                                        : 'Download a full copy of your database (products, orders, settings) in JSON format.'}
                                </p>
                                <button
                                    onClick={handleBackup}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 transition-colors shadow-sm"
                                >
                                    <Download size={18} />
                                    {locale === 'ru' ? 'Скачать резервную копию' : 'Download Backup JSON'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
