import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/storage';

export interface SavedAddress {
    id: string;
    locality: string;
    description: string;
}

interface AddressState {
    savedAddresses: SavedAddress[];
    selectedAddressId: string | null;
    currentAddress: SavedAddress | null;
    addAddress: (address: Partial<SavedAddress> & { locality: string; description: string }) => void;
    selectAddress: (id: string) => void;
    removeAddress: (id: string) => void;
}

export const useAddressStore = create<AddressState>()(
    persist(
        (set) => ({
            savedAddresses: [
                // A default sample address so the flow has something on first launch.
                { id: '1', locality: 'Sabangali', description: 'Portail bleu, mur blanc avec fleurs...' }
            ],
            selectedAddressId: '1',
            currentAddress: { id: '1', locality: 'Sabangali', description: 'Portail bleu, mur blanc avec fleurs...' },

            addAddress: (address) => set((state) => {
                const newAddress: SavedAddress = {
                    id: address.id || `${Date.now()}`,
                    locality: address.locality,
                    description: address.description,
                };
                const newAddresses = [newAddress, ...state.savedAddresses];
                return {
                    savedAddresses: newAddresses,
                    currentAddress: newAddress,
                    selectedAddressId: newAddress.id
                };
            }),

            selectAddress: (id) => set((state) => ({
                selectedAddressId: id,
                currentAddress: state.savedAddresses.find((a) => a.id === id) || state.currentAddress,
            })),

            removeAddress: (id) => set((state) => {
                const savedAddresses = state.savedAddresses.filter((a) => a.id !== id);
                const removedCurrent = state.selectedAddressId === id;
                // When the selected address is removed, fall back to the most recent one.
                const nextCurrent = removedCurrent ? (savedAddresses[0] ?? null) : state.currentAddress;
                return {
                    savedAddresses,
                    currentAddress: nextCurrent,
                    selectedAddressId: removedCurrent ? (nextCurrent?.id ?? null) : state.selectedAddressId,
                };
            }),
        }),
        {
            name: 'address-store',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
