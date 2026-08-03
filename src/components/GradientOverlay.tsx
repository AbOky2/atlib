import React from 'react';
import { View } from 'react-native';

/**
 * Bottom-anchored fade built from stacked rgba bands — pure JS, NO native module
 * (so it can't break a binary that hasn't been rebuilt). Used for the tab-bar fade.
 * API unchanged: `from` = opacity at the very bottom, `rgb` = "r,g,b".
 */
export function GradientOverlay({
    from = 0.85,
    heightPct = 70,
    rgb = '10,10,10',
    heightPx,
}: {
    from?: number;
    heightPct?: number;
    rgb?: string;
    heightPx?: number;
}) {
    const bands = 10; // enough bands that the stepping is imperceptible
    return (
        <View
            pointerEvents="none"
            className="absolute left-0 right-0 bottom-0"
            style={{ height: heightPx ?? (`${heightPct}%` as any) }}
        >
            {Array.from({ length: bands }).map((_, i) => {
                const t = i / (bands - 1); // 0 (top) → 1 (bottom)
                // ease-in curve so the fade is soft at the top and solid at the bottom
                const opacity = from * t * t;
                return <View key={i} style={{ flex: 1, backgroundColor: `rgba(${rgb},${opacity.toFixed(3)})` }} />;
            })}
        </View>
    );
}
