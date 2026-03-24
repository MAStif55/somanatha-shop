import { useState, useEffect } from 'react';
import { X, User, MapPin, Phone, Mail, MessageCircle, Package, Calendar, Edit, Save, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { Order, OrderItem } from '@/types/order';
import { Product } from '@/types/product';
import { useLanguage } from '@/contexts/LanguageContext';
import { updateOrder } from '@/lib/firestore-utils';
import { formatPrice } from '@/utils/currency';
import ImageUpload from './ImageUpload';
import ProductSelector from './ProductSelector';

interface OrderDetailsModalProps {
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void; // Callback to refresh parent list
}

export default function OrderDetailsModal({ order, isOpen, onClose, onUpdate }: OrderDetailsModalProps) {
    const { t, locale } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [editedOrder, setEditedOrder] = useState<Order | null>(null);
    const [showProductSelector, setShowProductSelector] = useState(false);
    const [saving, setSaving] = useState(false);

    // Standalone Notes State
    const [localNotes, setLocalNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [notesChanged, setNotesChanged] = useState(false);

    useEffect(() => {
        setEditedOrder(order);
        setLocalNotes(order?.notes || '');
        setNotesChanged(false);
        setIsEditing(false);
        setShowProductSelector(false);
    }, [order, isOpen]);

    if (!isOpen || !order || !editedOrder) return null;

    // Helper to format date
    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = typeof timestamp === 'number'
            ? new Date(timestamp)
            : new Date(timestamp.seconds * 1000);

        return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
        });
    };

    const handleSave = async () => {
        if (!editedOrder) return;
        setSaving(true);
        try {
            await updateOrder(editedOrder.id, {
                items: editedOrder.items,
                total: editedOrder.total,
                notes: localNotes, // Use local notes in case they were edited
                attachments: editedOrder.attachments
            });
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to save order", error);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalNotes(e.target.value);
        setNotesChanged(e.target.value !== (order.notes || ''));
    };

    const handleSaveNotes = async () => {
        setSavingNotes(true);
        try {
            await updateOrder(order.id, { notes: localNotes });
            setNotesChanged(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to save notes", error);
            alert("Failed to save notes");
        } finally {
            setSavingNotes(false);
        }
    };

    const updateItem = (index: number, field: keyof OrderItem, value: any) => {
        if (!editedOrder) return;
        const newItems = [...editedOrder.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Recalculate total if price or quantity changes
        if (field === 'price' || field === 'quantity') {
            const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            setEditedOrder({ ...editedOrder, items: newItems, total: newTotal });
        } else {
            setEditedOrder({ ...editedOrder, items: newItems });
        }
    };

    const deleteItem = (index: number) => {
        if (!editedOrder) return;
        if (!confirm('Remove this item?')) return;

        const newItems = editedOrder.items.filter((_, i) => i !== index);
        const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setEditedOrder({ ...editedOrder, items: newItems, total: newTotal });
    };

    const addProduct = (product: Product) => {
        if (!editedOrder) return;
        const newItem: OrderItem = {
            productId: product.id,
            productTitle: locale === 'ru' ? product.title.ru : product.title.en,
            quantity: 1,
            price: product.basePrice,
            configuration: {}
        };
        const newItems = [...editedOrder.items, newItem];
        const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        setEditedOrder({ ...editedOrder, items: newItems, total: newTotal });
        setShowProductSelector(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {locale === 'ru' ? 'Заказ' : 'Order'} #{order.id.slice(-8).toUpperCase()}
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase
                                ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'}`}>
                                {order.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(order.createdAt)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Edit size={16} />
                                {locale === 'ru' ? 'Редактировать' : 'Edit'}
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                <Save size={16} />
                                {saving ? (locale === 'ru' ? 'Сохранение...' : 'Saving...') : (locale === 'ru' ? 'Сохранить' : 'Save')}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Left Column: Customer Details */}
                    <div className="md:col-span-1 space-y-6">
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <User size={18} />
                                {locale === 'ru' ? 'Клиент' : 'Customer'}
                            </h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs">{locale === 'ru' ? 'Имя' : 'Name'}</p>
                                    <p className="font-medium text-gray-900">{order.customerName}</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Phone size={14} className="mt-1 text-gray-400" />
                                    <div>
                                        <p className="text-gray-500 text-xs">{locale === 'ru' ? 'Телефон' : 'Phone'}</p>
                                        <p className="font-medium text-gray-900">{order.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Mail size={14} className="mt-1 text-gray-400" />
                                    <div>
                                        <p className="text-gray-500 text-xs">Email</p>
                                        <p className="font-medium text-gray-900">{order.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <MapPin size={14} className="mt-1 text-gray-400" />
                                    <div>
                                        <p className="text-gray-500 text-xs">{locale === 'ru' ? 'Адрес' : 'Address'}</p>
                                        <p className="font-medium text-gray-900">{order.address}</p>
                                    </div>
                                </div>
                                {order.telegram && (
                                    <div className="flex items-center gap-2 bg-sky-50 p-2 rounded text-sky-700">
                                        <MessageCircle size={14} />
                                        <span className="font-medium">{order.telegram}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Customer Notes */}
                        {order.customerNotes && (
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <h4 className="text-xs font-bold text-yellow-800 uppercase mb-2 flex items-center gap-1">
                                    <MessageCircle size={12} />
                                    {locale === 'ru' ? 'Комментарий клиента' : 'Customer Note'}
                                </h4>
                                <p className="text-sm text-yellow-900 whitespace-pre-wrap">{order.customerNotes}</p>
                            </div>
                        )}

                        {/* Manager Notes (Always Editable) */}
                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Edit size={16} />
                                    {locale === 'ru' ? 'Заметки менеджера' : 'Manager Notes'}
                                </h3>
                                {notesChanged && (
                                    <button
                                        onClick={handleSaveNotes}
                                        disabled={savingNotes}
                                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {savingNotes ? (locale === 'ru' ? 'Сохр...' : 'Saving...') : (locale === 'ru' ? 'Сохранить' : 'Save Note')}
                                    </button>
                                )}
                            </div>
                            <textarea
                                value={localNotes}
                                onChange={handleNotesChange}
                                className={`w-full text-sm p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${notesChanged ? 'border-blue-300 bg-blue-50/10' : 'border-gray-200'}`}
                                rows={4}
                                placeholder={locale === 'ru' ? 'Внутренние заметки...' : 'Internal notes...'}
                            />
                        </div>
                    </div>

                    {/* Right Column: Items & Attachments */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Order Items */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Package size={18} />
                                    {locale === 'ru' ? 'Товары' : 'Items'}
                                </h3>
                            </div>

                            <div className="bg-gray-50 rounded-xl overflow-hidden border">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">{locale === 'ru' ? 'Товар' : 'Product'}</th>
                                            <th className="px-4 py-3 text-right">{locale === 'ru' ? 'Цена' : 'Price'}</th>
                                            <th className="px-4 py-3 text-center">{locale === 'ru' ? 'Кол-во' : 'Qty'}</th>
                                            <th className="px-4 py-3 text-right">{locale === 'ru' ? 'Всего' : 'Total'}</th>
                                            {isEditing && <th className="px-4 py-3 w-10"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {editedOrder.items.map((item, idx) => (
                                            <tr key={idx} className="bg-white">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{item.productTitle}</div>
                                                    {item.configuration && Object.keys(item.configuration).length > 0 && (
                                                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                                            {Object.entries(item.configuration).map(([k, v]) => (
                                                                <div key={k}>{k}: {v}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                                                            className="w-20 px-2 py-1 border rounded text-right"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-900">{formatPrice(item.price)}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                                                            className="w-16 px-2 py-1 border rounded text-center mx-auto"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-900">{item.quantity}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium whitespace-nowrap text-gray-900">
                                                    {formatPrice(item.price * item.quantity)}
                                                </td>
                                                {isEditing && (
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => deleteItem(idx)}
                                                            className="text-red-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold text-gray-900">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-right">{locale === 'ru' ? 'Итого:' : 'Total:'}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap text-lg">
                                                {formatPrice(editedOrder.total)}
                                            </td>
                                            {isEditing && <td></td>}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Add Item Actions */}
                            {isEditing && (
                                <div className="mt-3">
                                    {!showProductSelector ? (
                                        <button
                                            onClick={() => setShowProductSelector(true)}
                                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                        >
                                            <Plus size={16} />
                                            {locale === 'ru' ? 'Добавить товар' : 'Add Item'}
                                        </button>
                                    ) : (
                                        <ProductSelector
                                            onSelect={addProduct}
                                            onCancel={() => setShowProductSelector(false)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Attachments */}
                        <div className="border-t pt-6">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <ImageIcon size={18} />
                                {locale === 'ru' ? 'Вложения (фото, чеки)' : 'Attachments'}
                            </h3>
                            {isEditing ? (
                                <ImageUpload
                                    value={editedOrder.attachments || []}
                                    onChange={(images) => setEditedOrder({ ...editedOrder, attachments: images.map(img => img.url) })}
                                    storagePath={`orders/${order.id}`}
                                />
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {order.attachments && order.attachments.length > 0 ? (
                                        order.attachments.map((url, idx) => (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block aspect-square rounded-lg overflow-hidden border hover:border-blue-500 transition-colors"
                                            >
                                                <img src={url} alt={`Attachment ${idx}`} className="w-full h-full object-cover" />
                                            </a>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-8 text-center bg-gray-50 rounded-lg border border-dashed text-gray-400 text-sm">
                                            {locale === 'ru' ? 'Нет вложений' : 'No attachments'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
