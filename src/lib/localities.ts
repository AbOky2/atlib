export interface Locality {
    id: string;
    name: string;
    baseDeliveryTimeMins: number;
}

export const NDJAMENA_LOCALITIES: Locality[] = [
    { id: 'sabangali', name: 'Sabangali', baseDeliveryTimeMins: 15 },
    { id: 'moursal', name: 'Moursal', baseDeliveryTimeMins: 20 },
    { id: 'farcha', name: 'Farcha', baseDeliveryTimeMins: 35 },
    { id: 'ndjari', name: 'N\'Djari', baseDeliveryTimeMins: 30 },
    { id: 'chagoua', name: 'Chagoua', baseDeliveryTimeMins: 25 },
    { id: 'gassi', name: 'Gassi', baseDeliveryTimeMins: 45 },
    { id: 'ambleton', name: 'Ambatta', baseDeliveryTimeMins: 30 },
    { id: 'diguel', name: 'Diguel', baseDeliveryTimeMins: 40 },
    { id: 'walya', name: 'Walya', baseDeliveryTimeMins: 45 },
    { id: 'klemate', name: 'Klémat', baseDeliveryTimeMins: 10 },
];

const DEFAULT_DELIVERY_TIME_MINS = 30;

export function getEstimatedDeliveryTime(neighborhoodName: string): number {
    const needle = neighborhoodName.trim().toLowerCase();
    // Empty input would `includes('')`-match the first locality — guard it.
    if (!needle) return DEFAULT_DELIVERY_TIME_MINS;
    const locality = NDJAMENA_LOCALITIES.find(l =>
        needle.includes(l.name.toLowerCase()) ||
        l.name.toLowerCase().includes(needle)
    );
    return locality ? locality.baseDeliveryTimeMins : DEFAULT_DELIVERY_TIME_MINS;
}
