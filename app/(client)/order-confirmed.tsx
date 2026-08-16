import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, AccessibilityInfo, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { ChefHat } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { COLORS } from '../../src/lib/palette';

/**
 * Celebration interstitial between payment confirmation and tracking.
 *
 * Three acts (~4.5s total), driven purely by the core Animated API so it runs
 * on every build without native animation deps:
 *   1. the check draws itself inside a springing brand-orange disc — "Paiement confirmé"
 *   2. the disc flips to a chef hat while dots pulse — "Transmission au restaurant"
 *   3. confetti burst — "C'est parti !", then auto-navigate to tracking.
 * Tap anywhere (or "Passer") to skip. Honors Reduce Motion by cutting straight
 * to a short static confirmation.
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CHECK_PATH_LENGTH = 80;
const ACT_1_MS = 1500;
const ACT_2_MS = 1600;
const ACT_3_MS = 1500;

// Payment is cash on delivery — nothing has been charged at this point, so the
// copy celebrates the ORDER, never a "payment".
const STAGES = [
    { title: 'Commande confirmée', subtitle: 'Votre commande est validée' },
    { title: 'Transmission au restaurant', subtitle: 'Le chef reçoit votre commande…' },
    { title: "C'est parti !", subtitle: 'Suivez votre commande en direct' },
] as const;

const CONFETTI_COLORS = [COLORS.accent, COLORS.ink, COLORS.accentDark, '#FFC043', '#66D19E'];
const CONFETTI_COUNT = 14;

interface ConfettiSpec {
    angle: number;
    distance: number;
    size: number;
    color: string;
    rotation: number;
}

function buildConfetti(count: number): ConfettiSpec[] {
    return Array.from({ length: count }, (_, i) => ({
        // Deterministic fan: evenly spread angles with alternating radii — reads
        // as organic without Math.random re-layout on every render.
        angle: (i / count) * Math.PI * 2,
        distance: 90 + (i % 3) * 38,
        size: 7 + (i % 4) * 3,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotation: (i % 2 === 0 ? 1 : -1) * (180 + (i % 5) * 60),
    }));
}

export default function OrderConfirmedScreen() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();
    const [stage, setStage] = useState(0);

    const discScale = useRef(new Animated.Value(0)).current;
    const checkProgress = useRef(new Animated.Value(0)).current;
    const iconSwap = useRef(new Animated.Value(0)).current; // 0 = check, 1 = chef hat
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textShift = useRef(new Animated.Value(14)).current;
    const dotPulse = useRef(new Animated.Value(0)).current;
    const confettiProgress = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(0)).current;

    const confetti = useMemo(() => buildConfetti(CONFETTI_COUNT), []);
    const doneRef = useRef(false);

    const goToTracking = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        router.replace(orderId ? { pathname: '/tracking', params: { orderId } } : '/tracking');
    };

    useEffect(() => {
        let cancelled = false;
        const timers: ReturnType<typeof setTimeout>[] = [];
        const after = (ms: number, fn: () => void) => {
            timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
        };

        const showText = () => {
            textOpacity.setValue(0);
            textShift.setValue(14);
            Animated.parallel([
                Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.spring(textShift, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 160 }),
            ]).start();
        };

        const dotLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(dotPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(dotPulse, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]),
        );

        const run = async () => {
            const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
            if (cancelled) return;

            if (reduceMotion) {
                // Static confirmation, short dwell, no motion.
                discScale.setValue(1);
                checkProgress.setValue(1);
                textOpacity.setValue(1);
                textShift.setValue(0);
                after(1400, goToTracking);
                return;
            }

            // — Act 1 : payment confirmed —
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Animated.spring(discScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 140 }).start();
            Animated.timing(checkProgress, {
                toValue: 1,
                duration: 600,
                delay: 250,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false, // SVG stroke props can't ride the native driver
            }).start();
            Animated.sequence([
                Animated.delay(150),
                Animated.timing(ringScale, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            ]).start();
            showText();

            // — Act 2 : sending to the restaurant —
            after(ACT_1_MS, () => {
                setStage(1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Animated.timing(iconSwap, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
                dotLoop.start();
                showText();
            });

            // — Act 3 : confetti —
            after(ACT_1_MS + ACT_2_MS, () => {
                setStage(2);
                dotLoop.stop();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Animated.timing(confettiProgress, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }).start();
                showText();
            });

            after(ACT_1_MS + ACT_2_MS + ACT_3_MS, goToTracking);
        };

        run();
        return () => {
            cancelled = true;
            timers.forEach(clearTimeout);
            dotLoop.stop();
        };
        // Animation values are stable refs; this effect must run exactly once.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkOffset = checkProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [CHECK_PATH_LENGTH, 0],
    });

    return (
        <Pressable className="flex-1 bg-white" onPress={goToTracking} accessibilityLabel="Passer l'animation">
            <View className="flex-1 items-center justify-center px-8">
                {/* Expanding ring behind the disc */}
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        width: 148,
                        height: 148,
                        borderRadius: 74,
                        borderWidth: 2,
                        borderColor: COLORS.accent,
                        opacity: ringScale.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                        transform: [{ scale: ringScale.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.1] }) }],
                    }}
                />

                {/* Confetti burst */}
                {confetti.map((piece, i) => (
                    <Animated.View
                        key={i}
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            width: piece.size,
                            height: piece.size * 0.62,
                            borderRadius: 2,
                            backgroundColor: piece.color,
                            opacity: confettiProgress.interpolate({
                                inputRange: [0, 0.1, 0.8, 1],
                                outputRange: [0, 1, 1, 0],
                            }),
                            transform: [
                                {
                                    translateX: confettiProgress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, Math.cos(piece.angle) * piece.distance],
                                    }),
                                },
                                {
                                    translateY: confettiProgress.interpolate({
                                        inputRange: [0, 0.6, 1],
                                        outputRange: [0, Math.sin(piece.angle) * piece.distance, Math.sin(piece.angle) * piece.distance + 46],
                                    }),
                                },
                                {
                                    rotate: confettiProgress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', `${piece.rotation}deg`],
                                    }),
                                },
                            ],
                        }}
                    />
                ))}

                {/* Green disc with morphing icon */}
                <Animated.View
                    style={{
                        width: 132,
                        height: 132,
                        borderRadius: 66,
                        backgroundColor: COLORS.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [{ scale: discScale }],
                        shadowColor: COLORS.accent,
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.35,
                        shadowRadius: 24,
                        elevation: 10,
                    }}
                >
                    {/* Check (act 1) */}
                    <Animated.View
                        style={{
                            position: 'absolute',
                            opacity: iconSwap.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                            transform: [{ scale: iconSwap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }],
                        }}
                    >
                        <Svg width={72} height={72} viewBox="0 0 72 72">
                            <AnimatedCircle cx={36} cy={36} r={33} stroke="rgba(255,255,255,0.35)" strokeWidth={2.5} fill="none" />
                            <AnimatedPath
                                d="M20 37.5 L31 48.5 L52 26"
                                stroke="#FFFFFF"
                                strokeWidth={6}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                                strokeDasharray={CHECK_PATH_LENGTH}
                                strokeDashoffset={checkOffset}
                            />
                        </Svg>
                    </Animated.View>
                    {/* Chef hat (acts 2-3) */}
                    <Animated.View
                        style={{
                            opacity: iconSwap,
                            transform: [{ scale: iconSwap.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
                        }}
                    >
                        <ChefHat color="#FFFFFF" size={54} strokeWidth={1.8} />
                    </Animated.View>
                </Animated.View>

                {/* Staged copy */}
                <Animated.View
                    className="items-center mt-9"
                    style={{ opacity: textOpacity, transform: [{ translateY: textShift }], width: width - 64 }}
                >
                    <Text className="text-[26px] font-display tracking-tight text-ink text-center">
                        {STAGES[stage].title}
                    </Text>
                    <View className="flex-row items-center mt-2">
                        <Text className="text-[15px] font-body text-ink-muted text-center">
                            {STAGES[stage].subtitle}
                        </Text>
                        {stage === 1 && (
                            <Animated.Text
                                className="text-[15px] font-body text-ink-muted"
                                style={{ opacity: dotPulse }}
                            >
                                {' '}•••
                            </Animated.Text>
                        )}
                    </View>
                    {stage === 2 && orderId ? (
                        <View className="bg-fill px-4 py-2 rounded-full mt-4">
                            <Text className="text-[12px] font-labelbold text-ink-muted">
                                Commande #{String(orderId).slice(0, 8).toUpperCase()}
                            </Text>
                        </View>
                    ) : null}
                </Animated.View>
            </View>

            {/* Stage progress + skip */}
            <View className="items-center" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
                <View className="flex-row gap-1.5 mb-5">
                    {STAGES.map((_, i) => (
                        <View
                            key={i}
                            className="h-1.5 rounded-full"
                            style={{
                                width: i === stage ? 22 : 8,
                                backgroundColor: i <= stage ? COLORS.accent : COLORS.hairline,
                            }}
                        />
                    ))}
                </View>
                <Pressable onPress={goToTracking} hitSlop={12} className="active:opacity-50">
                    <Text className="text-[13px] font-labelbold text-ink-faint">Passer</Text>
                </Pressable>
            </View>
        </Pressable>
    );
}
