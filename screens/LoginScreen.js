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
import { loginCustomer, clearAuthError, selectAuthLoading, selectAuthError } from '../features/authSlice'

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch()
  const isLoading = useSelector(selectAuthLoading)
  const error = useSelector(selectAuthError)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    return () => { dispatch(clearAuthError()) }
  }, [])

  const handleLogin = async () => {
    if (!email.trim() || !password) return
    const result = await dispatch(loginCustomer({ email: email.trim(), password }))
    if (loginCustomer.fulfilled.match(result)) {
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
          <Text className="text-2xl font-bold text-[#111] mb-6">Connexion</Text>

          {error && (
            <View className="bg-[#fff0f0] rounded-[10px] p-3 mb-4 border-l-4 border-l-[#e53e3e]">
              <Text className="text-[#e53e3e] text-[13px]">{error}</Text>
            </View>
          )}

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
            <Text className="text-[13px] font-semibold text-[#444] mb-1.5">Mot de passe</Text>
            <TextInput
              className="border-[1.5px] border-[#e8e8e8] rounded-xl px-3.5 py-3 text-[15px] text-[#111] bg-[#fafafa]"
              placeholder="••••••••"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            className={`bg-[#111] rounded-[14px] py-4 items-center mt-2 ${(!email || !password || isLoading) ? 'opacity-50' : ''}`}
            onPress={handleLogin}
            disabled={!email || !password || isLoading}
            activeOpacity={0.8}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white text-base font-bold">Se connecter</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="items-center mt-6"
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.7}
        >
          <Text className="text-sm text-[#666]">
            Pas encore de compte ?{' '}
            <Text className="font-bold text-[#111]">Créer un compte</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}


