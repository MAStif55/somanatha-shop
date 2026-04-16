'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'recently-viewed';
const MAX_ITEMS = 6;

export interface RecentlyViewedItem {
    id: string;
    slug: string;
    title: { en: string; ru: string };
    image: string;
    price: number;
}

export function useRecentlyViewed() {
    const [items, setItems] = useState<RecentlyViewedItem[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setItems(JSON.parse(stored));
            }
        } catch {
            // Ignore parse errors
        }
    }, []);

    const addProduct = useCallback((product: RecentlyViewedItem) => {
        setItems(prev => {
            // Remove duplicate if exists
            const filtered = prev.filter(p => p.id !== product.id);
            // Prepend new item, cap at MAX_ITEMS
            const updated = [product, ...filtered].slice(0, MAX_ITEMS);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {
                // Quota exceeded — silently fail
            }
            return updated;
        });
    }, []);

    const getProducts = useCallback((excludeId?: string): RecentlyViewedItem[] => {
        if (!excludeId) return items;
        return items.filter(p => p.id !== excludeId);
    }, [items]);

    return { items, addProduct, getProducts };
}
