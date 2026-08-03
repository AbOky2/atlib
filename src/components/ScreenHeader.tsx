import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, X } from 'lucide-react-native';
import { shadowSoft } from '../lib/elevation';

/**
 * Shared top app bar.
 *
 * Solves the safe-area inconsistency that caused per-device misalignment:
 * every screen used to hand-roll `paddingTop: Math.max(insets.top + 10, 40)`
 * (and home hard-coded `pt-12`). Now a single component owns that math and
 * `useHeaderOffset()` returns the matching content offset for the ScrollView.
 */

// Height of the bar content below the status bar / notch.
export const HEADER_CONTENT_HEIGHT = 56;

/** Top inset used by the header, floored so small/no-notch devices still breathe. */
export function useHeaderInsetTop() {
    const insets = useSafeAreaInsets();
    return Math.max(insets.top, 18);
}

/** Total space a fixed header occupies — use as the ScrollView's paddingTop. */
export function useHeaderOffset() {
    return useHeaderInsetTop() + HEADER_CONTENT_HEIGHT;
}

type IconAction = {
    icon: React.ReactNode;
    onPress?: () => void;
};

interface ScreenHeaderProps {
    title?: string;
    subtitle?: string;
    /** Renders a leading circular icon button. */
    back?: 'arrow' | 'close';
    onBack?: () => void;
    /** Custom leading node (overrides `back`). */
    left?: React.ReactNode;
    /** Trailing node (icon button, count, etc.). */
    right?: React.ReactNode;
    /** Center the title (default: left-aligned next to the back button). */
    centerTitle?: boolean;
    /** Solid white (default), or fully transparent for hero overlays. */
    variant?: 'solid' | 'transparent';
    /** Show a hairline bottom border + soft shadow. */
    bordered?: boolean;
}

function IconButton({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={8}
            className="w-10 h-10 items-center justify-center rounded-full bg-surface-container-low active:scale-95"
        >
            {children}
        </Pressable>
    );
}

export function ScreenHeader({
    title,
    subtitle,
    back,
    onBack,
    left,
    right,
    centerTitle = false,
    variant = 'solid',
    bordered = true,
}: ScreenHeaderProps) {
    const insetTop = useHeaderInsetTop();

    const leading =
        left ??
        (back ? (
            <IconButton onPress={onBack}>
                {back === 'close' ? <X color="#1c1b1b" size={22} /> : <ArrowLeft color="#1c1b1b" size={22} />}
            </IconButton>
        ) : null);

    const TitleBlock = (
        <View className={centerTitle ? 'items-center' : ''}>
            {subtitle ? (
                <Text className="text-[11px] font-label uppercase tracking-[0.12em] text-ink-faint">
                    {subtitle}
                </Text>
            ) : null}
            {title ? (
                <Text
                    numberOfLines={1}
                    className="text-[22px] font-title tracking-[-0.01em] text-ink"
                >
                    {title}
                </Text>
            ) : null}
        </View>
    );

    const content = (
        <View
            style={{ paddingTop: insetTop, height: insetTop + HEADER_CONTENT_HEIGHT }}
            className="flex-row items-center justify-between px-5"
        >
            {centerTitle ? (
                <>
                    <View className="w-10 items-start">{leading}</View>
                    <View className="flex-1 items-center px-2">{TitleBlock}</View>
                    <View className="w-10 items-end">{right}</View>
                </>
            ) : (
                <>
                    <View className="flex-row items-center gap-3 flex-1">
                        {leading}
                        {TitleBlock}
                    </View>
                    {right ? <View className="ml-3">{right}</View> : null}
                </>
            )}
        </View>
    );

    if (variant === 'transparent') {
        return <View className="absolute top-0 left-0 right-0 z-50">{content}</View>;
    }

    // solid white (default) — opaque header with a hairline + soft shadow.
    return (
        <View
            className={`absolute top-0 left-0 right-0 z-50 bg-white ${bordered ? 'border-b border-hairline' : ''}`}
            style={shadowSoft}
        >
            {content}
        </View>
    );
}

export { IconButton };
