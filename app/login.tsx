import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Mail, Lock, Eye, EyeOff, ChevronRight, Sparkles, User } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';
import { BRAND, BRAND_TAGLINE, BRAND_FULL } from '../src/lib/brand';
import { shadowSoft, shadowFloat } from '../src/lib/elevation';

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState('');

    const { signIn, signUp, loading, error, clearError } = useAuthStore();

    const handleAuth = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (!email.trim() || !password.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        if (password.trim().length < 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        if (isSignUp) {
            await signUp(email.trim(), password.trim(), fullName.trim() || undefined);
        } else {
            await signIn(email.trim(), password.trim());
        }

        // Check auth state after the async call
        const state = useAuthStore.getState();
        if (state.isAuthenticated) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(client)/home' as any);
        }
    };

    return (
        <View className="flex-1 bg-[#1c1b1b]">
            {/* Single calm ambient glow */}
            <View
                className="absolute w-[500px] h-[500px] rounded-full"
                style={{
                    top: -150,
                    right: -150,
                    backgroundColor: 'rgba(255, 87, 51, 0.05)',
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Section */}
                    <View
                        className="px-8"
                        style={{ paddingTop: Math.max(insets.top + 60, 80) }}
                    >
                        {/* Brand */}
                        <View className="flex-row items-center gap-3 mb-6">
                            <View className="w-12 h-12 bg-[#FF5733] rounded-2xl items-center justify-center" style={shadowSoft}>
                                <Sparkles color="#fff" size={22} />
                            </View>
                            <View>
                                <Text className="text-2xl font-title tracking-tight text-white">{BRAND}</Text>
                                <Text className="text-[9px] font-label tracking-[0.08em] uppercase text-white/40">{BRAND_TAGLINE}</Text>
                            </View>
                        </View>

                        {/* Title */}
                        <Text className="text-5xl font-title tracking-tight text-white leading-tight mb-3">
                            {isSignUp ? 'Créez votre\ncompte' : 'Bon retour\nparmi nous'}
                        </Text>
                        <Text className="text-base text-white/40 font-body leading-relaxed">
                            {isSignUp
                                ? `Rejoignez la communauté ${BRAND_FULL}.`
                                : 'Connectez-vous pour commander vos plats préférés.'
                            }
                        </Text>
                    </View>

                    {/* Form Section */}
                    <View className="px-8 mt-12 flex-1">
                        {/* Full Name (sign up only) */}
                        {isSignUp && (
                            <View className="mb-5">
                                <Text className="text-[10px] font-label tracking-[0.08em] uppercase text-white/40 mb-3">Nom complet</Text>
                                <View className="bg-white/[0.06] rounded-2xl border border-white/[0.08] px-5 h-16 flex-row items-center gap-4">
                                    <User color="rgba(255,255,255,0.25)" size={20} />
                                    <TextInput
                                        className="flex-1 text-white text-base font-body"
                                        placeholder="Moustapha Abdallah"
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                        value={fullName}
                                        onChangeText={setFullName}
                                        autoCapitalize="words"
                                        style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Email */}
                        <View className="mb-5">
                            <Text className="text-[10px] font-label tracking-[0.08em] uppercase text-white/40 mb-3">Adresse email</Text>
                            <View className="bg-white/[0.06] rounded-2xl border border-white/[0.08] px-5 h-16 flex-row items-center gap-4">
                                <Mail color="rgba(255,255,255,0.25)" size={20} />
                                <TextInput
                                    className="flex-1 text-white text-base font-body"
                                    placeholder="votre@email.com"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View className="mb-5">
                            <Text className="text-[10px] font-label tracking-[0.08em] uppercase text-white/40 mb-3">Mot de passe</Text>
                            <View className="bg-white/[0.06] rounded-2xl border border-white/[0.08] px-5 h-16 flex-row items-center gap-4">
                                <Lock color="rgba(255,255,255,0.25)" size={20} />
                                <TextInput
                                    className="flex-1 text-white text-base font-body"
                                    placeholder="••••••••"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                />
                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setShowPassword(!showPassword);
                                    }}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    {showPassword
                                        ? <EyeOff color="rgba(255,255,255,0.25)" size={20} />
                                        : <Eye color="rgba(255,255,255,0.25)" size={20} />
                                    }
                                </Pressable>
                            </View>
                        </View>

                        {/* Forgot password */}
                        {!isSignUp && (
                            <Pressable className="self-end mb-8" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                                <Text className="text-xs font-labelbold text-[#FF5733]">Mot de passe oublié ?</Text>
                            </Pressable>
                        )}

                        {/* Error */}
                        {error && (
                            <View className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 mb-6">
                                <Text className="text-red-400 text-sm font-body">{error}</Text>
                            </View>
                        )}

                        {/* Submit Button */}
                        <Pressable
                            onPress={handleAuth}
                            disabled={loading}
                            className="bg-[#FF5733] h-16 rounded-2xl flex-row items-center justify-center active:scale-[0.98] mb-6"
                            style={{ ...shadowFloat, opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <View className="flex-row items-center gap-3">
                                    <Text className="text-white font-labelbold text-sm">
                                        {isSignUp ? 'Créer le compte' : 'Se connecter'}
                                    </Text>
                                    <ChevronRight color="#fff" size={20} />
                                </View>
                            )}
                        </Pressable>

                        {/* Divider */}
                        <View className="flex-row items-center gap-4 my-4">
                            <View className="flex-1 h-px bg-white/[0.06]" />
                            <Text className="text-[10px] font-label tracking-[0.08em] uppercase text-white/20">ou</Text>
                            <View className="flex-1 h-px bg-white/[0.06]" />
                        </View>

                        {/* Toggle */}
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setIsSignUp(!isSignUp);
                                clearError();
                            }}
                            className="py-4 items-center"
                        >
                            <Text className="text-white/50 text-sm font-body">
                                {isSignUp ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
                                <Text className="text-[#FF5733] font-labelbold">{isSignUp ? 'Se connecter' : "S'inscrire"}</Text>
                            </Text>
                        </Pressable>

                        {/* Skip */}
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.replace('/(client)/home' as any);
                            }}
                            className="py-3 items-center mb-8"
                        >
                            <Text className="text-white/20 text-xs font-label">Continuer sans compte →</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
