'use client';

import { useState, useRef, useCallback } from 'react';

/**
 * useUnsavedChanges Hook
 * 
 * Tracks changes to data and provides utilities for:
 * - Detecting if there are unsaved changes
 * - Resetting the "dirty" state after save
 * - Navigation blocking with confirmation
 * 
 * @example
 * ```tsx
 * const { 
 *   isDirty, 
 *   setOriginalData, 
 *   hasChanges, 
 *   markAsSaved 
 * } = useUnsavedChanges<MyDataType>();
 * 
 * // On initial load
 * useEffect(() => {
 *   const data = await loadData();
 *   setFormData(data);
 *   setOriginalData(data);
 * }, []);
 * 
 * // Check for changes
 * const isDirty = hasChanges(currentData);
 * 
 * // After saving
 * markAsSaved(currentData);
 * ```
 */

export interface UseUnsavedChangesReturn<T> {
    /** The original data snapshot */
    originalData: T | null;
    /** Set the original data (call after initial load) */
    setOriginalData: (data: T) => void;
    /** Check if current data differs from original */
    hasChanges: (currentData: T) => boolean;
    /** Update original data after a successful save */
    markAsSaved: (currentData: T) => void;
    /** Reset to no original data */
    reset: () => void;
}

export function useUnsavedChanges<T>(): UseUnsavedChangesReturn<T> {
    const originalData = useRef<T | null>(null);
    const [, forceUpdate] = useState({});

    const setOriginalData = useCallback((data: T) => {
        // Deep clone to avoid reference issues
        originalData.current = JSON.parse(JSON.stringify(data));
        forceUpdate({});
    }, []);

    const hasChanges = useCallback((currentData: T): boolean => {
        if (originalData.current === null) return false;
        return JSON.stringify(currentData) !== JSON.stringify(originalData.current);
    }, []);

    const markAsSaved = useCallback((currentData: T) => {
        originalData.current = JSON.parse(JSON.stringify(currentData));
        forceUpdate({});
    }, []);

    const reset = useCallback(() => {
        originalData.current = null;
        forceUpdate({});
    }, []);

    return {
        originalData: originalData.current,
        setOriginalData,
        hasChanges,
        markAsSaved,
        reset,
    };
}

/**
 * useNavigationGuard Hook
 * 
 * Provides state management for navigation with unsaved changes.
 * Use with ConfirmModal for the complete experience.
 * 
 * @example
 * ```tsx
 * const { 
 *   showModal, 
 *   pendingPath, 
 *   requestNavigation, 
 *   confirmNavigation, 
 *   cancelNavigation 
 * } = useNavigationGuard();
 * 
 * // When user clicks back/navigate
 * const handleBack = () => {
 *   if (isDirty) {
 *     requestNavigation('/previous-page');
 *   } else {
 *     router.push('/previous-page');
 *   }
 * };
 * 
 * // In JSX
 * <ConfirmModal
 *   isOpen={showModal}
 *   onConfirm={() => {
 *     confirmNavigation();
 *     router.push(pendingPath!);
 *   }}
 *   onCancel={cancelNavigation}
 *   onSave={async () => {
 *     await saveData();
 *     confirmNavigation();
 *     router.push(pendingPath!);
 *   }}
 * />
 * ```
 */

export interface UseNavigationGuardReturn {
    /** Whether the confirmation modal should be shown */
    showModal: boolean;
    /** The path the user is trying to navigate to */
    pendingPath: string | null;
    /** Call when user tries to navigate with unsaved changes */
    requestNavigation: (path: string) => void;
    /** Call when user confirms they want to leave */
    confirmNavigation: () => void;
    /** Call when user cancels navigation */
    cancelNavigation: () => void;
}

export function useNavigationGuard(): UseNavigationGuardReturn {
    const [showModal, setShowModal] = useState(false);
    const [pendingPath, setPendingPath] = useState<string | null>(null);

    const requestNavigation = useCallback((path: string) => {
        setPendingPath(path);
        setShowModal(true);
    }, []);

    const confirmNavigation = useCallback(() => {
        setShowModal(false);
        // Note: caller should handle the actual navigation
    }, []);

    const cancelNavigation = useCallback(() => {
        setShowModal(false);
        setPendingPath(null);
    }, []);

    return {
        showModal,
        pendingPath,
        requestNavigation,
        confirmNavigation,
        cancelNavigation,
    };
}
