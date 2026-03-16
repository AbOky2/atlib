import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { registerCustomer, clearAuthError, selectAuthLoading, selectAuthError } from '../features/authSlice'

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch()
  const isLoading = useSelector(selectAuthLoading)
  const error = useSelector(selectAuthError)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    return () => { dispatch(clearAuthError()) }
  }, [])

  const isValid = name.trim() && email.trim() && password.length >= 6 && password === confirm

  const handleRegister = async () => {
    if (!isValid) return
    const result = await dispatch(registerCustomer({
      email: email.trim(),
      password,
      name: name.trim(),
      phone: phone.trim() || undefined,
    }))
    if (registerCustomer.fulfilled.match(result)) {
      if (navigation.canGoBack()) {
        navigation.goBack()
      }
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f8f8f6]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyItems: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">

        <View className="items-center mb-10 mt-10">
          <Text className="text-[42px] font-[800] text-[#111] tracking-[-1px]">atlib</Text>
          <Text className="text-sm text-[#666] mt-1">Livraison à votre porte</Text>
        </View>

        <View className="bg-white rounded-[20px] p-7 shadow-sm shadow-black/5 elevation-4">
          <Text className="text-2xl font-bold text-[#111] mb-6">Créer un compte</Text>

          {error && (
            <View className="bg-[#fff0f0] rounded-[10px] p-3 mb-4 border-l-4 border-l-[#e53e3e]">
              <Text className="text-[#e53e3e] text-[13px]">{error}</Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-[#444] mb-1.5">Prénom et nom</Text>
            <TextInput
              className="border-[1.5px] border-[#e8e8e8] rounded-xl px-3.5 py-3 text-[15px] text-[#111] bg-[#fafafa]"
              placeholder="Jean Dupont"
              placeholderTextColor="#999"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </View>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-[#444] mb-1.5">Email</Text>
            <TextInput
              className="border-[1.5px] border-[#e8e8e8] rounded-xl px-3.5 py-3 text-[15px] text-[#111] bg-[#fafafa]"
              placeholder="vous@exemple.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
          </View>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-[#444] mb-1.5">Téléphone (optionnel)</Text>
            <TextInput
              className="border-[1.5px] border-[#e8e8e8] rounded-xl px-3.5 py-3 text-[15px] text-[#111] bg-[#fafafa]"
              placeholder="+235 66 00 00 00"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              returnKeyType="next"
            />
          </View>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-[#444] mb-1.5">Mot de passe</Text>
            <TextInput
              className="border-[1.5px] border-[#e8e8e8] rounded-xl px-3.5 py-3 text-[15px] text-[#111] bg-[#fafafa]"
              placeholder="6 caractères minimum"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="next"
            />
          </View>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-[#444] mb-1.5">Confirmer le mot de passe</Text>
            <TextInput
              className={`border-[1.5px] py-3 px-3.5 text-[15px] text-[#111] rounded-xl ${confirm && confirm !== password ? 'border-[#e53e3e] bg-[#fafafa]' : 'border-[#e8e8e8] bg-[#fafafa]'}`}
              placeholder="••••••••"
              placeholderTextColor="#999"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            {confirm.length > 0 && confirm !== password && (
              <Text className="text-[#e53e3e] text-[12px] mt-1">Les mots de passe ne correspondent pas</Text>
            )}
          </View>

          <TouchableOpacity
            className={`bg-[#111] rounded-[14px] py-4 items-center mt-2 ${(!isValid || isLoading) ? 'opacity-50' : ''}`}
            onPress={handleRegister}
            disabled={!isValid || isLoading}
            activeOpacity={0.8}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white text-base font-bold">Créer mon compte</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="items-center mt-6"
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text className="text-sm text-[#666]">
            Déjà un compte ?{' '}
            <Text className="font-bold text-[#111]">Se connecter</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}


