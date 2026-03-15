'use client';

import { useState, useEffect, useRef } from 'react';

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (suggestion: DaDataSuggestion) => void;
    error?: string;
    locale: 'ru' | 'en';
    placeholder?: string;
}

interface DaDataSuggestion {
    value: string;
    unrestricted_value: string;
    data: {
        postal_code: string;
        country: string;
        region_with_type: string;
        city_with_type: string;
        street_with_type: string;
        house: string;
        block: string;
        flat: string;
        // add other fields if needed
        [key: string]: any;
    };
}

const DADATA_TOKEN = '29bb6eb951cf8cbcfde2ea5f56193989ec1b9ed5';

export function AddressAutocomplete({
    value,
    onChange,
    onSelect,
    error,
    locale,
    placeholder,
}: AddressAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<DaDataSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Token ${DADATA_TOKEN}`,
                    },
                    body: JSON.stringify({
                        query: query,
                        locations: [{ country_iso_code: 'RU' }], // Restrict to Russia
                        count: 5,
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                setSuggestions(data.suggestions || []);
                setIsOpen(true);
            }
        } catch (error) {
            console.error('DaData error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce wrapper
    const debouncedFetch = useRef(
        debounce((query: string) => fetchSuggestions(query), 300)
    ).current;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
        debouncedFetch(newValue);
    };

    const handleSelect = (suggestion: DaDataSuggestion) => {
        onChange(suggestion.value);
        onSelect(suggestion);
        setSuggestions([]);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <input
                type="text"
                value={value}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#0D0A0B] border border-[#C9A227]/30 rounded-lg text-[#F5ECD7] placeholder-[#F5ECD7]/40 focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition-colors"
                placeholder={placeholder}
                autoComplete="off"
            />
            {isLoading && (
                <div className="absolute right-3 top-3.5">
                    <div className="w-5 h-5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {error && <p className="text-red-400 text-sm mt-1">{error}</p>}

            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-[#1A1819] border border-[#C9A227]/30 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            onClick={() => handleSelect(suggestion)}
                            className="px-4 py-3 text-[#F5ECD7] hover:bg-[#C9A227]/20 cursor-pointer transition-colors text-sm"
                        >
                            {suggestion.value}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
