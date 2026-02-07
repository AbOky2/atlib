import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeftIcon, MapPinIcon, PhoneIcon, ChevronDownIcon } from 'react-native-heroicons/outline'
import { setCurrentAddress, selectAvailableZones, selectCurrentAddress } from '../features/addressSlice'
import Card from '../src/ui/Card'
import Button from '../src/ui/Button'

const AddressScreen = () => {
  const navigation = useNavigation()
  const dispatch = useDispatch()
  const availableZones = useSelector(selectAvailableZones)
  const currentAddress = useSelector(selectCurrentAddress)

  const [selectedZone, setSelectedZone] = useState(currentAddress.zone || '')
  const [landmark, setLandmark] = useState(currentAddress.landmark || '')
  const [description, setDescription] = useState(currentAddress.description || '')
  const [phoneNumber, setPhoneNumber] = useState(currentAddress.phoneNumber || '')
  const [showZoneSelector, setShowZoneSelector] = useState(false)

  const commonLandmarks = [
    'Mosquée Centrale',
    'Marché Central',
    'Rond-point',
    'École',
    'Hôpital',
    'Station d\'essence',
    'Pharmacie',
    'Banque',
    'Poste',
    'Commissariat'
  ]

  const handleSaveAddress = () => {
    if (!selectedZone || !landmark || !description || !phoneNumber) {
      Alert.alert('Information manquante', 'Veuillez remplir tous les champs obligatoires')
      return
    }

    if (phoneNumber.length < 8) {
      Alert.alert('Numéro invalide', 'Veuillez saisir un numéro de téléphone valide')
      return
    }

    const newAddress = {
      zone: selectedZone,
      landmark,
      description,
      phoneNumber,
      estimatedDistance: calculateDistance(selectedZone),
      deliveryTime: calculateDeliveryTime(selectedZone)
    }

    dispatch(setCurrentAddress(newAddress))
    navigation.goBack()
  }

  const calculateDistance = (zone) => {
    const distanceMap = {
      'N\'Djamena Centre': '2-5 km',
      'Chagoua': '5-8 km',
      'Moursal': '3-6 km',
      'Ardep Djoumal': '4-7 km',
      'Gassi': '6-10 km',
      'Klemat': '8-12 km',
      'Sabangali': '5-9 km',
      'Angabo': '7-11 km',
      'Goudji': '10-15 km',
      'Kabalaye': '12-18 km'
    }
    return distanceMap[zone] || '5-10 km'
  }

  const calculateDeliveryTime = (zone) => {
    const timeMap = {
      'N\'Djamena Centre': '20-30 min',
      'Chagoua': '30-45 min',
      'Moursal': '25-35 min',
      'Ardep Djoumal': '30-40 min',
      'Gassi': '35-50 min',
      'Klemat': '45-60 min',
      'Sabangali': '30-45 min',
      'Angabo': '40-55 min',
      'Goudji': '50-70 min',
      'Kabalaye': '60-80 min'
    }
    return timeMap[zone] || '30-45 min'
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="p-1">
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-text">Adresse de livraison</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Zone selector */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-text mb-2">Zone / Quartier *</Text>
          <TouchableOpacity
            onPress={() => setShowZoneSelector(!showZoneSelector)}
            className="border border-border rounded-md px-4 py-3 flex-row items-center justify-between bg-surface"
            activeOpacity={0.7}
          >
            <Text className={selectedZone ? "text-text" : "text-muted"}>
              {selectedZone || "Sélectionner votre zone"}
            </Text>
            <ChevronDownIcon size={18} color="#6B7280" />
          </TouchableOpacity>

          {showZoneSelector && (
            <View className="mt-3 border border-border rounded-md bg-surface max-h-52">
              <ScrollView>
                {availableZones.map((zone, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedZone(zone)
                      setShowZoneSelector(false)
                    }}
                    className="px-4 py-3 border-b border-border"
                  >
                    <Text className="text-sm text-text">{zone}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </Card>

        {/* Landmark */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-text mb-2">Point de repère principal *</Text>
          <TextInput
            value={landmark}
            onChangeText={setLandmark}
            placeholder="Ex: Mosquée Centrale, Marché, École..."
            className="border border-border rounded-md px-4 py-3 text-sm text-text bg-surface"
            multiline
            placeholderTextColor="#6B7280"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
            {commonLandmarks.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setLandmark(item)}
                activeOpacity={0.7}
                className="bg-primarySoft border border-primary/10 rounded-full px-3 py-1.5 mr-2"
              >
                <Text className="text-xs text-primary font-semibold">{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* Description */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-text mb-2">Description du chemin *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Derrière la mosquée, maison bleue avec portail blanc..."
            className="border border-border rounded-md px-4 py-3 text-sm text-text bg-surface h-28"
            multiline
            textAlignVertical="top"
            placeholderTextColor="#6B7280"
          />
          <Text className="text-xs text-muted mt-2">
            Soyez précis pour faciliter la livraison
          </Text>
        </Card>

        {/* Phone */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-text mb-2">Numéro de téléphone *</Text>
          <View className="flex-row items-center border border-border rounded-md bg-surface">
            <View className="pl-3">
              <PhoneIcon size={18} color="#6B7280" />
            </View>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Ex: 66 12 34 56"
              className="flex-1 px-3 py-3 text-sm text-text"
              keyboardType="phone-pad"
              placeholderTextColor="#6B7280"
            />
          </View>
          <Text className="text-xs text-muted mt-2">
            Obligatoire pour contact direct du livreur
          </Text>
        </Card>

        {/* Estimate */}
        {selectedZone && (
          <Card className="mb-4 bg-primarySoft border-primary/10">
            <Text className="text-sm font-semibold text-primary mb-2">Estimation de livraison</Text>
            <Text className="text-sm text-muted">Distance: {calculateDistance(selectedZone)}</Text>
            <Text className="text-sm text-muted">Temps estimé: {calculateDeliveryTime(selectedZone)}</Text>
          </Card>
        )}

        {/* Important */}
        <Card className="mb-6 bg-accentSoft border-accent/20">
          <Text className="text-sm text-accent font-semibold mb-1">📌 Important</Text>
          <Text className="text-sm text-accent/80">
            Assurez-vous que votre téléphone soit allumé et accessible. Le livreur vous contactera avant la livraison.
          </Text>
        </Card>
      </ScrollView>

      {/* CTA */}
      <View className="px-4 pb-6 pt-2 border-t border-border bg-surface">
        <Button label="Confirmer l'adresse" onPress={handleSaveAddress} />
      </View>
    </SafeAreaView>
  )
}

export default AddressScreen 