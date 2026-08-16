import React from 'react';
import {
    View,
    Text,
    Pressable,
    TextInput,
    ActivityIndicator,
    type TextInputProps,
    type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, X, Minus, Plus, type LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { COLORS } from '../../lib/palette';
import { shadowSoft } from '../../lib/elevation';

/**
 * The shared interface vocabulary.
 *
 * Every one of these existed three or four times across the app, each version a
 * couple of pixels and one font weight away from the others — a back button
 * built differently on four screens, three heights of primary CTA, inputs whose
 * borders disagreed. Those near-identical variants are exactly what made the
 * product feel assembled rather than designed. One component per role now, so a
 * decision is taken once and applies everywhere.
 *
 * Sizes come from the tokens in tailwind.config.js; the few numbers written here
 * are the intrinsic geometry of a control and are named.
 */

/** The single page gutter. Every screen aligns its content to this axis. */
export const SCREEN_GUTTER = 24;
/** Minimum comfortable touch target (Apple HIG / WCAG 2.5.5). */
export const TOUCH_MIN = 44;

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'bodylg' | 'body' | 'label' | 'caption' | 'eyebrow';
type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'onDark' | 'onDarkMuted';

const VARIANT_CLASS: Record<TextVariant, string> = {
    display: 'text-display font-display tracking-tighter',
    h1: 'text-h1 font-title tracking-tighter',
    h2: 'text-h2 font-title tracking-tight',
    h3: 'text-h3 font-heading tracking-tight',
    bodylg: 'text-bodylg font-body',
    body: 'text-body font-body',
    label: 'text-label font-label',
    caption: 'text-caption font-body',
    eyebrow: 'text-eyebrow font-label uppercase tracking-eyebrow',
};

const TONE_CLASS: Record<TextTone, string> = {
    primary: 'text-ink',
    secondary: 'text-ink-muted',
    tertiary: 'text-ink-faint',
    accent: 'text-accent',
    danger: 'text-danger',
    onDark: 'text-white',
    onDarkMuted: 'text-white/60',
};

export function TypeText({
    variant = 'body',
    tone = 'primary',
    className = '',
    children,
    ...rest
}: {
    variant?: TextVariant;
    tone?: TextTone;
    className?: string;
    children: React.ReactNode;
} & React.ComponentProps<typeof Text>) {
    return (
        <Text className={`${VARIANT_CLASS[variant]} ${TONE_CLASS[tone]} ${className}`} {...rest}>
            {children}
        </Text>
    );
}

// ---------------------------------------------------------------------------
// Section heading — eyebrow + title as one typographic group
// ---------------------------------------------------------------------------

export function SectionTitle({
    eyebrow,
    title,
    action,
    className = '',
}: {
    eyebrow?: string;
    title: string;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <View className={`flex-row items-end justify-between ${className}`}>
            <View className="flex-1 pr-4">
                {/* 4 pt between eyebrow and title: they read as one block, not two. */}
                {eyebrow ? <TypeText variant="eyebrow" tone="tertiary" className="mb-1">{eyebrow}</TypeText> : null}
                <TypeText variant="h2">{title}</TypeText>
            </View>
            {action}
        </View>
    );
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

export function Divider({ className = '' }: { className?: string }) {
    return <View className={`h-px bg-hairline ${className}`} />;
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'destructive';

const BUTTON_SURFACE: Record<ButtonVariant, string> = {
    primary: 'bg-accent active:bg-accent-pressed',
    dark: 'bg-ink',
    secondary: 'bg-fill active:bg-fill-strong',
    ghost: 'bg-transparent',
    destructive: 'bg-danger-soft',
};

const BUTTON_LABEL: Record<ButtonVariant, string> = {
    primary: 'text-white',
    dark: 'text-white',
    secondary: 'text-ink',
    ghost: 'text-ink',
    destructive: 'text-danger',
};

/**
 * The one primary action of a context.
 *
 * `trailing` is for the amount or the arrow: it sits on the opposite edge of a
 * single internal grid, so the composition is the same on every screen instead
 * of the price floating differently in each bar.
 */
export function Button({
    label,
    onPress,
    variant = 'primary',
    trailing,
    leading,
    loading = false,
    disabled = false,
    size = 'cta',
    className = '',
    accessibilityLabel,
}: {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    trailing?: React.ReactNode;
    leading?: React.ReactNode;
    loading?: boolean;
    disabled?: boolean;
    size?: 'cta' | 'control';
    className?: string;
    accessibilityLabel?: string;
}) {
    const inactive = disabled || loading;
    const height = size === 'cta' ? 56 : 44;
    const spread = !!trailing;

    return (
        <Pressable
            onPress={() => {
                if (inactive) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onPress();
            }}
            disabled={inactive}
            accessibilityRole="button"
            accessibilityState={{ disabled: inactive, busy: loading }}
            accessibilityLabel={accessibilityLabel ?? label}
            className={`rounded-full flex-row items-center px-6 active:scale-[0.98] ${
                spread ? 'justify-between' : 'justify-center'
            } ${inactive ? 'bg-fill-strong' : BUTTON_SURFACE[variant]} ${className}`}
            style={{ height }}
        >
            {loading ? (
                <View className="flex-1 items-center">
                    <ActivityIndicator color={variant === 'secondary' ? COLORS.ink : '#fff'} />
                </View>
            ) : (
                <>
                    <View className="flex-row items-center gap-2">
                        {leading}
                        <Text
                            numberOfLines={1}
                            className={`text-bodylg font-labelbold ${inactive ? 'text-ink-disabled' : BUTTON_LABEL[variant]}`}
                        >
                            {label}
                        </Text>
                    </View>
                    {trailing}
                </>
            )}
        </Pressable>
    );
}

/**
 * Circular icon control — back, close, share, favourite.
 *
 * Fixed at the minimum touch target so the visual size can never drift below
 * what a thumb needs.
 */
export function IconButton({
    icon: Icon,
    onPress,
    label,
    tone = 'surface',
    className = '',
}: {
    icon: LucideIcon;
    onPress: () => void;
    label: string;
    tone?: 'surface' | 'onPhoto' | 'plain';
    className?: string;
}) {
    const surface =
        tone === 'onPhoto' ? 'bg-black/45' : tone === 'plain' ? 'bg-transparent' : 'bg-fill';
    const color = tone === 'onPhoto' ? '#ffffff' : COLORS.ink;

    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={label}
            hitSlop={6}
            className={`items-center justify-center rounded-full active:scale-95 ${surface} ${className}`}
            style={{ width: TOUCH_MIN, height: TOUCH_MIN }}
        >
            <Icon color={color} size={22} strokeWidth={2} />
        </Pressable>
    );
}

export const BackButton = ({ onPress, variant = 'arrow', tone = 'surface' }: {
    onPress: () => void;
    variant?: 'arrow' | 'close';
    tone?: 'surface' | 'onPhoto' | 'plain';
}) => (
    <IconButton
        icon={variant === 'close' ? X : ArrowLeft}
        onPress={onPress}
        label={variant === 'close' ? 'Fermer' : 'Retour'}
        tone={tone}
    />
);

// ---------------------------------------------------------------------------
// Chip — a single-choice control (cash amount, filter, tag)
// ---------------------------------------------------------------------------

export function Chip({
    label,
    selected,
    onPress,
    className = '',
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
    className?: string;
}) {
    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            className={`px-5 rounded-full items-center justify-center border active:scale-[0.97] ${
                selected ? 'bg-ink border-ink' : 'bg-surface border-hairline'
            } ${className}`}
            style={{ height: 46 }}
        >
            <Text className={`text-label font-labelbold ${selected ? 'text-white' : 'text-ink'}`}>
                {label}
            </Text>
        </Pressable>
    );
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

const FIELD_BASE = 'bg-surface rounded-card border px-4';

export function Field({
    label,
    helper,
    error,
    icon: Icon,
    multiline = false,
    counter,
    className = '',
    ...input
}: {
    label: string;
    helper?: string;
    error?: string | null;
    icon?: LucideIcon;
    multiline?: boolean;
    counter?: string;
    className?: string;
} & TextInputProps) {
    const borderColor = error ? COLORS.danger : COLORS.hairline;

    return (
        <View className={className}>
            <TypeText variant="eyebrow" tone="tertiary" className="mb-2">{label}</TypeText>

            <View
                className={`${FIELD_BASE} ${multiline ? 'py-3' : 'flex-row items-center gap-3'}`}
                style={{ borderColor, ...(multiline ? { minHeight: 116 } : { height: 56 }) }}
            >
                {Icon && !multiline ? <Icon color={COLORS.inkFaint} size={20} /> : null}
                <TextInput
                    className={`flex-1 text-bodylg font-body text-ink ${multiline ? '' : 'h-full'}`}
                    placeholderTextColor={COLORS.inkFaint}
                    multiline={multiline}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    style={multiline ? { minHeight: 92 } : { paddingVertical: 0 }}
                    {...input}
                />
            </View>

            {/* Helper, error and counter share one row so the field never grows a
                stray gap below it. */}
            {(helper || error || counter) && (
                <View className="flex-row items-start justify-between mt-2 gap-4">
                    <Text className={`flex-1 text-caption font-body ${error ? 'text-danger' : 'text-ink-faint'}`}>
                        {error ?? helper ?? ''}
                    </Text>
                    {counter ? <Text className="text-caption font-body text-ink-faint">{counter}</Text> : null}
                </View>
            )}
        </View>
    );
}

// ---------------------------------------------------------------------------
// Quantity stepper
// ---------------------------------------------------------------------------

export function QuantityStepper({
    value,
    onChange,
    min = 1,
    max = 99,
}: {
    value: number;
    onChange: (next: number) => void;
    min?: number;
    max?: number;
}) {
    const step = (delta: number) => {
        const next = Math.min(Math.max(value + delta, min), max);
        if (next === value) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(next);
    };

    // The visual control is 44 pt tall; hitSlop carries each button to the full
    // touch target without inflating the bar.
    return (
        <View className="flex-row items-center bg-fill rounded-full" style={{ height: 44, padding: 4 }}>
            <Pressable
                onPress={() => step(-1)}
                hitSlop={{ top: 8, bottom: 8, left: 10, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Réduire la quantité"
                disabled={value <= min}
                className="w-9 h-9 rounded-full bg-surface items-center justify-center active:scale-95"
            >
                <Minus color={value <= min ? COLORS.inkDisabled : COLORS.ink} size={17} strokeWidth={2.4} />
            </Pressable>

            <Text className="w-8 text-center text-bodylg font-title text-ink">{value}</Text>

            <Pressable
                onPress={() => step(1)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Augmenter la quantité"
                disabled={value >= max}
                className="w-9 h-9 rounded-full bg-surface items-center justify-center active:scale-95"
            >
                <Plus color={value >= max ? COLORS.inkDisabled : COLORS.ink} size={17} strokeWidth={2.4} />
            </Pressable>
        </View>
    );
}

// ---------------------------------------------------------------------------
// Bottom action bar
// ---------------------------------------------------------------------------

/**
 * The sticky footer that carries a screen's primary action.
 *
 * Owns the home-indicator inset once, so no screen has to remember it — and the
 * CTA sits at the same distance from the physical edge everywhere.
 */
export function BottomActionBar({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: ViewStyle;
}) {
    const insets = useSafeAreaInsets();
    return (
        <View
            className="absolute bottom-0 left-0 right-0 bg-surface border-t border-hairline"
            style={[
                { paddingBottom: Math.max(insets.bottom, 16), paddingTop: 12, paddingHorizontal: SCREEN_GUTTER },
                style,
            ]}
        >
            {children}
        </View>
    );
}

/** Space a scroll view must reserve so content is never hidden by the bar. */
export const BOTTOM_BAR_CLEARANCE = 96;

// ---------------------------------------------------------------------------
// Card — a grouped surface. Hairline first, elevation only when it truly floats.
// ---------------------------------------------------------------------------

export function Card({
    children,
    elevated = false,
    className = '',
    style,
}: {
    children: React.ReactNode;
    elevated?: boolean;
    className?: string;
    style?: ViewStyle;
}) {
    return (
        <View
            className={`bg-surface rounded-panel border border-hairline ${className}`}
            style={[elevated ? shadowSoft : undefined, style]}
        >
            {children}
        </View>
    );
}

// ---------------------------------------------------------------------------
// Summary row — one line of an order total, used by cart AND payment
// ---------------------------------------------------------------------------

export function SummaryRow({
    label,
    value,
    emphasis = false,
}: {
    label: string;
    value: string;
    emphasis?: boolean;
}) {
    if (emphasis) {
        return (
            <View className="flex-row items-baseline justify-between">
                <TypeText variant="label" tone="secondary" className="uppercase tracking-eyebrow">
                    {label}
                </TypeText>
                <Text className="text-h1 font-display tracking-tighter text-ink">{value}</Text>
            </View>
        );
    }
    return (
        <View className="flex-row items-center justify-between">
            <TypeText variant="body" tone="secondary">{label}</TypeText>
            <TypeText variant="body" className="font-label">{value}</TypeText>
        </View>
    );
}
