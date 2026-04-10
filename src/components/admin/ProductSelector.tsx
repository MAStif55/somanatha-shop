'use client';

import { getAllProducts } from '@/actions/admin-actions';

import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';

import { Product, getThumbImageUrl } from '@/types/product';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProductSelectorProps {
    onSelect: (product: Product) => void;
    onCancel: () => void;
}

export default function ProductSelector({ onSelect, onCancel }: ProductSelectorProps) {
    const { locale } = useLanguage();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await getAllProducts() as Product[];
                setProducts(data);
            } catch (error) {
                console.error("Failed to fetch products", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const filteredProducts = products.filter(p =>
        p.title.ru.toLowerCase().includes(search.toLowerCase()) ||
        p.title.en.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-gray-50 border rounded-lg p-4 mt-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900">
                    {locale === 'ru' ? 'Добавить товар' : 'Add Product'}
                </h4>
                <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
                    {locale === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={locale === 'ru' ? 'Поиск товара...' : 'Search product...'}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg active:ring-2 active:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
                {loading ? (
                    <p className="text-center text-gray-500 py-4">{locale === 'ru' ? 'Загрузка...' : 'Loading...'}</p>
                ) : filteredProducts.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">{locale === 'ru' ? 'Товары не найдены' : 'No products found'}</p>
                ) : (
                    filteredProducts.map(product => (
                        <div
                            key={product.id}
                            onClick={() => onSelect(product)}
                            className="flex items-center gap-3 p-2 bg-white rounded border hover:border-blue-500 cursor-pointer transition-colors"
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                {product.images[0] && (
                                    <img src={getThumbImageUrl(product.images[0])} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-sm text-gray-900">
                                    {locale === 'ru' ? product.title.ru : product.title.en}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {product.basePrice} ₽
                                </div>
                            </div>
                            <div className="text-blue-500">
                                <Plus size={18} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
