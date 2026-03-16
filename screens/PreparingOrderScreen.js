import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect } from 'react'
import { useNavigation, CommonActions } from '@react-navigation/native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
  FadeInUp,
  FadeInLeft,
  Easing,
} from 'react-native-reanimated'
import * as Progress from 'react-native-progress'

const STEPS = [
  { label: 'Commande envoyée', delay: 0 },
  { label: 'En attente du restaurant', delay: 600 },
  { label: 'Confirmation en cours...', delay: 1400 },
]

export default function PreparingOrderScreen() {
  const navigation = useNavigation()

  // Pulsing ring animation
  const pulse = useSharedValue(1)
  // Rotating outer ring
  const rotate = useSharedValue(0)

  useEffect(() => {
    // Pulse the icon container
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
    // Slow spin on the outer ring
    rotate.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    )

    const timer = setTimeout(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [{ name: 'MainTabs' }, { name: 'OrderTracking' }],
        }),
      )
    }, 3200)
    return () => clearTimeout(timer)
  }, [])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }))

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }))

  return (
    <SafeAreaView style={styles.root}>

      {/* Animated icon */}
      <View style={styles.iconWrapper}>
        {/* Dashed rotating ring */}
        <Animated.View style={[styles.outerRing, rotateStyle]} />

        {/* Pulsing icon */}
        <Animated.View style={[styles.iconBubble, pulseStyle]}>
          <View style={styles.iconInner}>
            <Text style={styles.iconEmoji}>🛍️</Text>
          </View>
        </Animated.View>
      </View>

      {/* Title */}
      <Animated.Text
        entering={FadeInUp.delay(200).duration(500)}
        style={styles.title}
      >
        Commande en cours
      </Animated.Text>

      <Animated.Text
        entering={FadeInUp.delay(350).duration(500)}
        style={styles.subtitle}
      >
        Votre commande est transmise au restaurant.
      </Animated.Text>

      {/* Progress bar */}
      <Animated.View
        entering={FadeIn.delay(500).duration(400)}
        style={styles.progressWrapper}
      >
        <Progress.Bar
          indeterminate
          color="white"
          unfilledColor="rgba(255,255,255,0.2)"
          borderWidth={0}
          height={3}
          width={null}
          borderRadius={2}
        />
      </Animated.View>

      {/* Steps */}
      {STEPS.map((step, i) => (
        <Animated.View
          key={i}
          entering={FadeInLeft.delay(step.delay + 200).duration(400)}
          style={styles.step}
        >
          <View style={styles.stepDot} />
          <Text style={styles.stepLabel}>{step.label}</Text>
        </Animated.View>
      ))}
    </SafeAreaView>
  )
}

const BG = '#7A1E3A'

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: BG,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  outerRing: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderStyle: 'dashed',
  },
  iconBubble: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 32 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    fontSize: 14,
  },
  progressWrapper: {
    width: '100%',
    marginBottom: 32,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginRight: 12,
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
})
