import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View, AccessibilityInfo } from 'react-native';

import { BRAND, BRAND_TAGLINE, BRAND_CITY } from '../lib/brand';
import { COLORS } from '../lib/palette';

/**
 * Branded reveal played once per cold start, right after the (white) native
 * splash hides — same warm background so the hand-off is seamless.
 *
 * Choreography (~1.9s): the wordmark rises and settles, the accent dot pops in
 * with a spring, the tagline breathes in below, brief hold, then the whole veil
 * fades and scales away to reveal the app. Honors Reduce Motion with a simple
 * cross-fade.
 */
export function BrandSplash({ onDone }: { onDone: () => void }) {
    const wordmark = useRef(new Animated.Value(0)).current; // 0 → hidden/low, 1 → settled
    const dot = useRef(new Animated.Value(0)).current;
    const tagline = useRef(new Animated.Value(0)).current;
    const veil = useRef(new Animated.Value(1)).current; // overlay opacity
    const veilScale = useRef(new Animated.Value(1)).current;
    const doneRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        const finish = () => {
            if (doneRef.current || cancelled) return;
            doneRef.current = true;
            onDone();
        };

        const run = async () => {
            const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
            if (cancelled) return;

            if (reduceMotion) {
                wordmark.setValue(1);
                dot.setValue(1);
                tagline.setValue(1);
                Animated.sequence([
                    Animated.delay(900),
                    Animated.timing(veil, { toValue: 0, duration: 350, useNativeDriver: true }),
                ]).start(finish);
                return;
            }

            Animated.sequence([
                Animated.delay(120),
                // Wordmark rises and settles.
                Animated.timing(wordmark, {
                    toValue: 1,
                    duration: 520,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                // Accent dot pops.
                Animated.spring(dot, { toValue: 1, useNativeDriver: true, damping: 9, stiffness: 240 }),
                // Tagline breathes in.
                Animated.timing(tagline, {
                    toValue: 1,
                    duration: 380,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.delay(520),
                // Veil lifts.
                Animated.parallel([
                    Animated.timing(veil, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                    Animated.timing(veilScale, { toValue: 1.045, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                ]),
            ]).start(finish);
        };

        run();
        return () => {
            cancelled = true;
        };
        // Animation values are stable refs; run exactly once per cold start.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10000,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: COLORS.background,
                opacity: veil,
                transform: [{ scale: veilScale }],
            }}
        >
            <View className="items-center">
                <Animated.View
                    className="flex-row items-end"
                    style={{
                        opacity: wordmark,
                        transform: [
                            { translateY: wordmark.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                        ],
                    }}
                >
                    <Text className="text-display font-display tracking-tighter text-ink">
                        {BRAND}
                    </Text>
                    <Animated.View
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: COLORS.accent,
                            marginLeft: 4,
                            marginBottom: 8,
                            opacity: dot,
                            transform: [{ scale: dot }],
                        }}
                    />
                </Animated.View>
                <Animated.Text
                    className="text-eyebrow font-label text-ink-faint uppercase"
                    style={{
                        letterSpacing: 3,
                        marginTop: 12,
                        opacity: tagline,
                        transform: [
                            { translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                        ],
                    }}
                >
                    {BRAND_TAGLINE} · {BRAND_CITY}
                </Animated.Text>
            </View>
        </Animated.View>
    );
}
