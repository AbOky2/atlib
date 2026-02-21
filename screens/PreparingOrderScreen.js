import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useRef } from 'react'
import { useNavigation, CommonActions } from '@react-navigation/native'
import * as Animatable from 'react-native-animatable'
import * as Progress from 'react-native-progress'

const STEPS = [
  { label: 'Commande envoyée', delay: 0 },
  { label: 'En attente du restaurant', delay: 600 },
  { label: 'Confirmation en cours...', delay: 1400 },
]

const PreparingOrderScreen = () => {
  const navigation = useNavigation()

  useEffect(() => {
    const timer = setTimeout(() => {
      // Reset the stack so back from OrderTracking always returns to Home
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [{ name: 'MainTabs' }, { name: 'OrderTracking' }],
        }),
      )
    }, 3200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <SafeAreaView
      className="flex-1 items-center justify-center px-8"
      style={{ backgroundColor: '#7A1E3A' }}
    >
      {/* Animated icon */}
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={1600}
        className="mb-10"
      >
        <View
          className="rounded-full items-center justify-center"
          style={{
            width: 96,
            height: 96,
            backgroundColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <View
            className="rounded-full items-center justify-center"
            style={{
              width: 68,
              height: 68,
              backgroundColor: 'rgba(255,255,255,0.25)',
            }}
          >
            <Text style={{ fontSize: 32 }}>🛍️</Text>
          </View>
        </View>
      </Animatable.View>

      {/* Title */}
      <Animatable.Text
        animation="fadeInUp"
        delay={200}
        className="text-2xl font-extrabold text-white text-center mb-2"
      >
        Commande en cours
      </Animatable.Text>
      <Animatable.Text
        animation="fadeInUp"
        delay={400}
        className="text-white/70 text-center mb-10 leading-6"
      >
        Votre commande est transmise au restaurant.
      </Animatable.Text>

      {/* Progress indicator */}
      <View className="w-full mb-8">
        <Progress.Bar
          indeterminate
          color="white"
          unfilledColor="rgba(255,255,255,0.2)"
          borderWidth={0}
          height={4}
          width={null}
          borderRadius={2}
        />
      </View>

      {/* Steps */}
      {STEPS.map((step, i) => (
        <Animatable.View
          key={i}
          animation="fadeInLeft"
          delay={step.delay}
          className="flex-row items-center self-start mb-3"
        >
          <View
            className="rounded-full mr-3"
            style={{
              width: 8,
              height: 8,
              backgroundColor: 'rgba(255,255,255,0.6)',
            }}
          />
          <Text className="text-white/80 text-sm font-medium">{step.label}</Text>
        </Animatable.View>
      ))}
    </SafeAreaView>
  )
}

export default PreparingOrderScreen
