'use client';

export const dynamic = 'force-dynamic';

import { getProductById } from '@/actions/admin-actions';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { Product } from '@/types/product';
import ProductForm from '@/components/admin/ProductForm';

function EditProductContent() {
    const searchParams = useSearchParams();
    const id = searchParams?.get('id');
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            if (id) {
                const data = await getProductById(id) as Product | null;
                setProduct(data);
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (loading) return <div className="text-center py-12">Loading...</div>;
    if (!product) return <div className="text-center py-12">Product not found.</div>;

    return (
        <div className="container mx-auto max-w-4xl">
            <ProductForm initialData={product} isEditMode={true} />
        </div>
    );
}

export default function EditProductPage() {
    return (
        <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <EditProductContent />
        </Suspense>
    );
}
