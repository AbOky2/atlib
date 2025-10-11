import { View, Text, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native'
import React, { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeftIcon, MapPinIcon, PhoneIcon } from 'react-native-heroicons/outline'
import { setCurrentAddress, selectAvailableZones, selectCurrentAddress } from '../features/addressSlice'

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
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeftIcon size={24} color="#00CCBB" />
        </TouchableOpacity>
        <Text className="text-lg font-bold">Adresse de livraison</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Sélection de zone */}
        <View className="mb-6">
          <Text className="text-base font-semibold mb-2 text-gray-700">Zone / Quartier *</Text>
          <TouchableOpacity
            onPress={() => setShowZoneSelector(!showZoneSelector)}
            className="border border-gray-300 rounded-lg p-3 flex-row items-center justify-between"
          >
            <Text className={selectedZone ? "text-black" : "text-gray-400"}>
              {selectedZone || "Sélectionner votre zone"}
            </Text>
            <MapPinIcon size={20} color="#00CCBB" />
          </TouchableOpacity>
          
          {showZoneSelector && (
            <View className="mt-2 border border-gray-200 rounded-lg bg-gray-50 max-h-48">
              <ScrollView>
                {availableZones.map((zone, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedZone(zone)
                      setShowZoneSelector(false)
                    }}
                    className="p-3 border-b border-gray-200"
                  >
                    <Text className="text-base">{zone}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Point de repère */}
        <View className="mb-6">
          <Text className="text-base font-semibold mb-2 text-gray-700">Point de repère principal *</Text>
          <TextInput
            value={landmark}
            onChangeText={setLandmark}
            placeholder="Ex: Mosquée Centrale, Marché, École..."
            className="border border-gray-300 rounded-lg p-3 text-base"
            multiline
          />
          <Text className="text-xs text-gray-500 mt-1">
            Suggestions : {commonLandmarks.slice(0, 3).join(', ')}
          </Text>
        </View>

        {/* Description détaillée */}
        <View className="mb-6">
          <Text className="text-base font-semibold mb-2 text-gray-700">Description du chemin *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Derrière la mosquée, maison bleue avec portail blanc, 3ème maison à droite..."
            className="border border-gray-300 rounded-lg p-3 text-base h-20"
            multiline
            textAlignVertical="top"
          />
          <Text className="text-xs text-gray-500 mt-1">
            Soyez précis pour faciliter la livraison
          </Text>
        </View>

        {/* Numéro de téléphone */}
        <View className="mb-6">
          <Text className="text-base font-semibold mb-2 text-gray-700">Numéro de téléphone *</Text>
          <View className="flex-row items-center border border-gray-300 rounded-lg">
            <PhoneIcon size={20} color="#00CCBB" className="ml-3" />
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Ex: 66 12 34 56"
              className="flex-1 p-3 text-base"
              keyboardType="phone-pad"
            />
          </View>
          <Text className="text-xs text-gray-500 mt-1">
            Obligatoire pour contact direct du livreur
          </Text>
        </View>

        {/* Aperçu estimation */}
        {selectedZone && (
          <View className="bg-[#00CCBB] bg-opacity-10 p-4 rounded-lg mb-6">
            <Text className="text-base font-semibold text-[#00CCBB] mb-2">
              Estimation de livraison
            </Text>
            <Text className="text-sm text-gray-600">
              Distance: {calculateDistance(selectedZone)}
            </Text>
            <Text className="text-sm text-gray-600">
              Temps estimé: {calculateDeliveryTime(selectedZone)}
            </Text>
          </View>
        )}

        {/* Note importante */}
        <View className="bg-yellow-50 p-4 rounded-lg mb-6">
          <Text className="text-sm text-yellow-800 font-semibold mb-1">
            📍 Important
          </Text>
          <Text className="text-sm text-yellow-700">
            Assurez-vous que votre téléphone soit allumé et accessible. Le livreur vous contactera avant la livraison.
          </Text>
        </View>
      </ScrollView>

      {/* Bouton sauvegarder */}
      <View className="p-4 border-t border-gray-200">
        <TouchableOpacity
          onPress={handleSaveAddress}
          className="bg-[#00CCBB] rounded-lg p-4"
        >
          <Text className="text-white text-center font-bold text-lg">
            Confirmer l'adresse
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default AddressScreen 