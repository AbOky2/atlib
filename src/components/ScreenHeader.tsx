import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, TypeText, TOUCH_MIN, SCREEN_GUTTER } from './ui';

/**
 * Shared top app bar.
 *
 * Solves the safe-area inconsistency that caused per-device misalignment:
 * every screen used to hand-roll `paddingTop: Math.max(insets.top + 10, 40)`
 * (and home hard-coded `pt-12`). Now a single component owns that math and
 * `useHeaderOffset()` returns the matching content offset for the ScrollView.
 */

// Height of the bar content below the status bar / notch. One value, so every
// screen's scroll offset and every title baseline agree.
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
        left ?? (back ? <BackButton variant={back} onPress={() => onBack?.()} /> : null);

    const TitleBlock = (
        <View className={centerTitle ? 'items-center' : 'flex-1'}>
            {subtitle ? (
                <Text className="text-eyebrow font-label uppercase tracking-wide text-ink-faint">
                    {subtitle}
                </Text>
            ) : null}
            {title ? (
                <Text
                    numberOfLines={1}
                    className="text-h2 font-title tracking-tight text-ink"
                >
                    {title}
                </Text>
            ) : null}
        </View>
    );

    const content = (
        <View
            style={{ paddingTop: insetTop, height: insetTop + HEADER_CONTENT_HEIGHT, paddingHorizontal: SCREEN_GUTTER }}
            className="flex-row items-center justify-between"
        >
            {centerTitle ? (
                <>
                    {/* Both wings reserve one touch target; a wider `right` (two icons)
                        simply pushes the title's centring zone, never the title itself. */}
                    <View style={{ minWidth: TOUCH_MIN }} className="items-start">{leading}</View>
                    <View className="flex-1 items-center px-2">{TitleBlock}</View>
                    <View style={{ minWidth: TOUCH_MIN }} className="items-end">{right}</View>
                </>
            ) : (
                <>
                    <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
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

    // Solid surface. A hairline separates it from the content — an app bar does
    // not float above the page, so it casts no shadow.
    return (
        <View className={`absolute top-0 left-0 right-0 z-50 bg-surface ${bordered ? 'border-b border-hairline' : ''}`}>
            {content}
        </View>
    );
}
