'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

/**
 * Language/Localization Context
 * 
 * Provides internationalization support with dictionary-based translations.
 * Hydration-safe implementation that prevents server/client mismatches.
 */

// Import your locale files here
import ruDict from '@/locales/ru.json';
import enDict from '@/locales/en.json';

// ============================================================================
// TYPES
// ============================================================================

type Locale = 'ru' | 'en';
type Dictionary = typeof ruDict;

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    dictionary: Dictionary;
    isHydrated: boolean;
}

// ============================================================================
// CONTEXT SETUP
// ============================================================================

const dictionaries: Record<Locale, Dictionary> = {
    ru: ruDict,
    en: enDict,
};

// Default locale used for SSR - this MUST match what server renders
const DEFAULT_LOCALE: Locale = 'ru';
const LOCALE_STORAGE_KEY = 'somanatha-locale';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
    defaultLocale?: Locale;
}

export function LanguageProvider({ children, defaultLocale = DEFAULT_LOCALE }: LanguageProviderProps) {
    // Start with default locale to match server render
    const [locale, setLocaleState] = useState<Locale>(defaultLocale);
    const [isHydrated, setIsHydrated] = useState(false);

    // On mount, check localStorage for saved preference
    useEffect(() => {
        const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
        if (savedLocale && (savedLocale === 'ru' || savedLocale === 'en')) {
            setLocaleState(savedLocale);
        }
        setIsHydrated(true);
    }, []);

    // Persist locale changes to localStorage
    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }, []);

    const dictionary = dictionaries[locale];

    // Helper function to get nested value from dictionary using dot notation
    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        const keys = key.split('.');
        let value: unknown = dictionary;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = (value as Record<string, unknown>)[k];
            } else {
                // Silent in production, warn in development
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`Translation key not found: ${key}`);
                }
                return key;
            }
        }

        let str = typeof value === 'string' ? value : key;

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                str = str.replace(`{${key}}`, String(value));
            });
        }

        return str;
    }, [dictionary]);

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t, dictionary, isHydrated }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextType {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Alias for convenience
export const useTranslation = useLanguage;
