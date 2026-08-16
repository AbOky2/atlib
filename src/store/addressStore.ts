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

// v0 shipped a pre-seeded sample address ("Portail bleu…") that real users could
// unknowingly order to. v1 starts empty and the migration purges that sample.
const isLegacySample = (a: SavedAddress | null | undefined) =>
    a?.id === '1' && a.locality === 'Sabangali' && a.description.startsWith('Portail bleu');

export const useAddressStore = create<AddressState>()(
    persist(
        (set) => ({
            savedAddresses: [],
            selectedAddressId: null,
            currentAddress: null,

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
            version: 1,
            storage: createJSONStorage(() => zustandStorage),
            migrate: (persisted: any, version) => {
                if (persisted && version < 1) {
                    persisted.savedAddresses = (persisted.savedAddresses ?? []).filter(
                        (a: SavedAddress) => !isLegacySample(a),
                    );
                    if (isLegacySample(persisted.currentAddress)) {
                        persisted.currentAddress = persisted.savedAddresses[0] ?? null;
                        persisted.selectedAddressId = persisted.currentAddress?.id ?? null;
                    }
                }
                return persisted;
            },
        }
    )
);
