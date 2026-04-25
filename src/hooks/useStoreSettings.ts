'use client';

import { getPublicSettings } from '@/actions/catalog-actions';

import { useState, useEffect } from 'react';
import { StoreSettings, defaultSettings } from '@/types/settings';


// Module-level cache so multiple components don't trigger redundant database reads
let cachedSettings: StoreSettings | null = null;
let fetchPromise: Promise<StoreSettings> | null = null;

function fetchSettings(): Promise<StoreSettings> {
    if (cachedSettings) return Promise.resolve(cachedSettings);
    if (fetchPromise) return fetchPromise;

    fetchPromise = getPublicSettings().then((data) => {
        // Deep-merge with defaults to ensure new fields always have values
        cachedSettings = {
            ...defaultSettings,
            ...data,
            contact: { ...defaultSettings.contact, ...(data.contact || {}) },
            shipping: { ...defaultSettings.shipping, ...(data.shipping || {}) },
            notifications: {
                ...defaultSettings.notifications,
                ...(data.notifications || {}),
                templates: {
                    ...defaultSettings.notifications.templates,
                    ...((data.notifications || {}).templates || {}),
                },
            },
        };
        fetchPromise = null;
        return cachedSettings;
    }).catch(() => {
        fetchPromise = null;
        return defaultSettings;
    });

    return fetchPromise;
}

/**
 * Hook to consume store settings from the database.
 * Returns defaultSettings immediately, then resolves with live values.
 * Uses module-level caching to avoid redundant reads.
 */
export function useStoreSettings() {
    const [settings, setSettings] = useState<StoreSettings>(cachedSettings ?? defaultSettings);
    const [loading, setLoading] = useState(!cachedSettings);

    useEffect(() => {
        let cancelled = false;
        fetchSettings().then((data) => {
            if (!cancelled) {
                setSettings(data);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, []);

    return { settings, loading };
}

/** Invalidate cache (call after admin saves settings) */
export function invalidateSettingsCache() {
    cachedSettings = null;
    fetchPromise = null;
}
