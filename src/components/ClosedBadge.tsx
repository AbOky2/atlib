import { View, Text } from 'react-native';

import { CLOSED_LABEL } from '../lib/availability';

/**
 * Marks a restaurant that isn't taking orders. Shown on discovery surfaces so a
 * customer learns a kitchen is closed BEFORE building a cart they can't submit —
 * the frustration of a dead "Commander" button is entirely avoidable.
 */
export function ClosedBadge({ tone = 'onPhoto' }: { tone?: 'onPhoto' | 'onSurface' }) {
    const onPhoto = tone === 'onPhoto';
    return (
        <View
            className={`px-2.5 py-1 rounded-full ${onPhoto ? 'bg-black/70' : 'bg-fill-strong'}`}
        >
            <Text
                className={`text-eyebrow font-labelbold uppercase tracking-[0.08em] ${
                    onPhoto ? 'text-white' : 'text-ink-muted'
                }`}
            >
                {CLOSED_LABEL}
            </Text>
        </View>
    );
}
