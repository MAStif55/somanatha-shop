import { create } from 'zustand';

interface CartUIState {
    isDrawerOpen: boolean;
    promoBubbleVisible: boolean;
    openDrawer: () => void;
    closeDrawer: () => void;
    toggleDrawer: () => void;
    setPromoBubbleVisible: (visible: boolean) => void;
}

export const useCartUIStore = create<CartUIState>((set) => ({
    isDrawerOpen: false,
    promoBubbleVisible: false,
    openDrawer: () => set({ isDrawerOpen: true }),
    closeDrawer: () => set({ isDrawerOpen: false }),
    toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
    setPromoBubbleVisible: (visible) => set({ promoBubbleVisible: visible }),
}));
