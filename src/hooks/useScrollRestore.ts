'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Saves scroll position to sessionStorage on scroll (debounced),
 * and restores it once `isReady` becomes true (i.e. after async data loads).
 *
 * This ensures scroll restoration works even on iOS Safari where the browser
 * resets scroll to 0 during client-side re-renders with loading states.
 */
export function useScrollRestore(isReady: boolean) {
    const pathname = usePathname();
    const key = `scroll_${pathname}`;
    const hasRestored = useRef(false);

    // Save scroll position on scroll (debounced to 100ms)
    useEffect(() => {
        // Enforce manual scroll restoration to prevent browser interference
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        let timeout: ReturnType<typeof setTimeout>;
        const handleScroll = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                sessionStorage.setItem(key, String(window.scrollY));
            }, 100);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            if ('scrollRestoration' in history) {
                history.scrollRestoration = 'auto';
            }
            clearTimeout(timeout);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [key]);

    const [shouldBeVisible, setShouldBeVisible] = useState(false);

    // Initial check: do we have a saved position?
    // If yes, start invisible. If no, start visible.
    useEffect(() => {
        const saved = sessionStorage.getItem(key);
        if (!saved || parseInt(saved, 10) === 0) {
            setShouldBeVisible(true);
        }
    }, [key]);

    // Restore scroll position synchronously BEFORE paint
    // We use useLayoutEffect so the user doesn't see a jump from top -> scroll position
    useLayoutEffect(() => {
        if (!isReady || hasRestored.current) return;
        hasRestored.current = true;

        const saved = sessionStorage.getItem(key);
        if (saved) {
            const y = parseInt(saved, 10);
            if (y > 0) {
                window.scrollTo(0, y);
            }
        }

        // Make content visible after restoration attempt
        setShouldBeVisible(true);
    }, [isReady, key]);

    return shouldBeVisible;
}
