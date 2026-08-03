import React from 'react';
import { Pressable, Text, View } from 'react-native';

/**
 * Uber-Eats-style category filter chip used on Home and Explore (single source of
 * truth so both screens stay consistent). Active = soft grey fill, inactive =
 * white with a hairline border. Icon keeps its own colour in both states.
 */
export function CategoryChip({
    icon,
    label,
    active,
    onPress,
}: {
    icon: React.ReactElement<{ color?: string; size?: number }>;
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`flex-row items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full active:scale-[0.97] ${
                active ? 'bg-surface-container-high border border-hairline' : 'bg-white border border-hairline'
            }`}
        >
            {/* Keep each icon's own accent colour for a bit of life. */}
            <View>{React.cloneElement(icon, { size: 18 })}</View>
            <Text className="text-[14px] font-labelbold tracking-tight text-ink">{label}</Text>
        </Pressable>
    );
}
