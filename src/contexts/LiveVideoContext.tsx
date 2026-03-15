'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

interface LiveVideoContextType {
    activeHeroId: string | null;
    registerCard: (id: string, element: HTMLElement) => void;
    unregisterCard: (id: string) => void;
}

const LiveVideoContext = createContext<LiveVideoContextType>({
    activeHeroId: null,
    registerCard: () => { },
    unregisterCard: () => { },
});

export const useLiveVideoContext = () => useContext(LiveVideoContext);

export function LiveVideoProvider({ children }: { children: React.ReactNode }) {
    const [activeHeroId, setActiveHeroId] = useState<string | null>(null);
    const registeredElements = useRef<Map<string, HTMLElement>>(new Map());
    const visibleEntries = useRef<Map<string, IntersectionObserverEntry>>(new Map());
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Pick the topmost visible element as the hero
    const pickHero = useCallback(() => {
        let topmostId: string | null = null;
        let topmostY = Infinity;

        visibleEntries.current.forEach((entry, id) => {
            if (entry.isIntersecting && entry.boundingClientRect.top < topmostY) {
                topmostY = entry.boundingClientRect.top;
                topmostId = id;
            }
        });

        setActiveHeroId(topmostId);
    }, []);

    // Create observer once on mount
    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const id = (entry.target as HTMLElement).dataset.liveVideoId;
                    if (!id) return;

                    if (entry.isIntersecting) {
                        visibleEntries.current.set(id, entry);
                    } else {
                        visibleEntries.current.delete(id);
                    }
                });
                pickHero();
            },
            { threshold: 0.3 }
        );

        return () => {
            observerRef.current?.disconnect();
        };
    }, [pickHero]);

    const registerCard = useCallback((id: string, element: HTMLElement) => {
        registeredElements.current.set(id, element);
        element.dataset.liveVideoId = id;
        observerRef.current?.observe(element);
    }, []);

    const unregisterCard = useCallback((id: string) => {
        const element = registeredElements.current.get(id);
        if (element) {
            observerRef.current?.unobserve(element);
            delete element.dataset.liveVideoId;
        }
        registeredElements.current.delete(id);
        visibleEntries.current.delete(id);
        pickHero();
    }, [pickHero]);

    return (
        <LiveVideoContext.Provider value={{ activeHeroId, registerCard, unregisterCard }}>
            {children}
        </LiveVideoContext.Provider>
    );
}

