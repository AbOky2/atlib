import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Mail, Lock, Eye, EyeOff, ChevronRight, Sparkles, User, MailCheck, Phone, KeyRound } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';
import { isValidChadPhone, formatChadPhone } from '../src/lib/phone';
import { BRAND, BRAND_TAGLINE, BRAND_FULL } from '../src/lib/brand';
import { shadowSoft, shadowFloat } from '../src/lib/elevation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Phone is the default: here a number is the identity, an email address is not. */
type AuthMode = 'phone' | 'email';

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const [mode, setMode] = useState<AuthMode>('phone');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    // Client-side validation errors and positive notices, shown in the same
    // banners as server errors — feedback must never be haptic-only.
    const [formError, setFormError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const { signIn, signUp, requestPhoneCode, verifyPhoneCode, requestPasswordReset, loading, error, clearError } = useAuthStore();

    const resetFeedback = () => {
        setFormError(null);
        setNotice(null);
        clearError();
    };

    const switchMode = (next: AuthMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        resetFeedback();
        setMode(next);
        setCodeSent(false);
        setCode('');
    };

    const handleSendCode = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        resetFeedback();
        if (!isValidChadPhone(phone)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setFormError('Entrez un numéro tchadien valide (ex : 66 12 34 56).');
            return;
        }
        const result = await requestPhoneCode(phone);
        if (result === 'code-sent') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCodeSent(true);
            setNotice(`Code envoyé au ${formatChadPhone(phone)}.`);
        }
    };

    const handleVerifyCode = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        resetFeedback();
        if (code.trim().length < 4) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setFormError('Saisissez le code reçu par SMS.');
            return;
        }
        const result = await verifyPhoneCode(phone, code, fullName);
        if (result === 'ok') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/home');
        }
    };

    const handleAuth = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        resetFeedback();

        if (!EMAIL_REGEX.test(email.trim())) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setFormError('Saisissez une adresse email valide.');
            return;
        }

        if (password.trim().length < 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setFormError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        const result = isSignUp
            ? await signUp(email.trim(), password.trim(), fullName.trim() || undefined)
            : await signIn(email.trim(), password.trim());

        if (result === 'confirm-email') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setNotice('Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.');
            setIsSignUp(false);
            return;
        }

        if (result === 'ok') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/home');
        }
    };

    const handleForgotPassword = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        resetFeedback();
        if (!EMAIL_REGEX.test(email.trim())) {
            setFormError('Saisissez votre adresse email ci-dessus, puis réappuyez sur « Mot de passe oublié ».');
            return;
        }
        if (await requestPasswordReset(email) === 'ok') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setNotice(`Email de réinitialisation envoyé à ${email.trim()}. Vérifiez votre boîte mail.`);
        }
    };

    return (
        <View className="flex-1 bg-background">
            {/* Single calm ambient glow */}
            <View
                className="absolute w-[500px] h-[500px] rounded-full"
                style={{
                    top: -150,
                    right: -150,
                    backgroundColor: 'rgba(255, 87, 51, 0.07)',
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
                        className="px-6"
                        style={{ paddingTop: Math.max(insets.top + 60, 80) }}
                    >
                        {/* Brand */}
                        <View className="flex-row items-center gap-3 mb-6">
                            <View className="w-12 h-12 bg-accent rounded-card items-center justify-center" style={shadowSoft}>
                                <Sparkles color="#fff" size={22} />
                            </View>
                            <View>
                                <Text className="text-h2 font-title tracking-tight text-ink">{BRAND}</Text>
                                <Text className="text-eyebrow font-label tracking-[0.08em] uppercase text-ink-faint">{BRAND_TAGLINE}</Text>
                            </View>
                        </View>

                        {/* Title */}
                        <Text className="text-display font-title tracking-tight text-ink leading-tight mb-3">
                            {mode === 'phone'
                                ? (codeSent ? 'Votre code\nde connexion' : 'Votre\nnuméro')
                                : isSignUp ? 'Créez votre\ncompte' : 'Bon retour\nparmi nous'}
                        </Text>
                        <Text className="text-bodylg text-ink-muted font-body leading-relaxed">
                            {mode === 'phone'
                                ? (codeSent
                                    ? `Entrez le code à 6 chiffres envoyé au ${formatChadPhone(phone)}.`
                                    : `Un code par SMS, et c'est tout. C'est aussi le numéro que le restaurant appellera.`)
                                : isSignUp
                                    ? `Rejoignez la communauté ${BRAND_FULL}.`
                                    : 'Connectez-vous pour commander vos plats préférés.'
                            }
                        </Text>
                    </View>

                    {/* Form Section */}
                    <View className="px-6 mt-10 flex-1">
                        {/* Method switch — phone first, email kept for existing accounts */}
                        <View className="flex-row bg-fill rounded-card p-1 mb-7">
                            {(['phone', 'email'] as AuthMode[]).map((m) => (
                                <Pressable
                                    key={m}
                                    onPress={() => switchMode(m)}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: mode === m }}
                                    className={`flex-1 h-11 rounded-chip items-center justify-center flex-row gap-2 ${
                                        mode === m ? 'bg-white' : ''
                                    }`}
                                >
                                    {m === 'phone'
                                        ? <Phone color={mode === m ? '#1c1b1b' : '#8d8a87'} size={15} />
                                        : <Mail color={mode === m ? '#1c1b1b' : '#8d8a87'} size={15} />}
                                    <Text className={`text-label font-labelbold ${mode === m ? 'text-ink' : 'text-ink-faint'}`}>
                                        {m === 'phone' ? 'Téléphone' : 'Email'}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* ---- Phone (SMS code) ---- */}
                        {mode === 'phone' && (
                            <>
                                <View className="mb-5">
                                    <Text className="text-eyebrow font-label tracking-[0.08em] uppercase text-ink-faint mb-3">
                                        Numéro de téléphone
                                    </Text>
                                    <View className="bg-white rounded-card border border-hairline px-5 h-16 flex-row items-center gap-3">
                                        <Text className="text-ink-muted text-bodylg font-labelbold">+235</Text>
                                        <View className="w-px h-6 bg-hairline" />
                                        <TextInput
                                            className="flex-1 text-ink text-bodylg font-body"
                                            placeholder="66 12 34 56"
                                            placeholderTextColor="#8d8a87"
                                            value={phone}
                                            onChangeText={(v) => { setPhone(v); if (codeSent) setCodeSent(false); }}
                                            keyboardType="phone-pad"
                                            editable={!codeSent}
                                            maxLength={20}
                                            style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                        />
                                        {codeSent && (
                                            <Pressable onPress={() => { setCodeSent(false); setCode(''); }} hitSlop={10}>
                                                <Text className="text-accent text-caption font-labelbold">Modifier</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                </View>

                                {codeSent && (
                                    <View className="mb-5">
                                        <Text className="text-eyebrow font-label tracking-[0.08em] uppercase text-ink-faint mb-3">
                                            Code reçu par SMS
                                        </Text>
                                        <View className="bg-white rounded-card border border-hairline px-5 h-16 flex-row items-center gap-4">
                                            <KeyRound color="#8d8a87" size={20} />
                                            <TextInput
                                                className="flex-1 text-ink text-h2 font-title"
                                                placeholder="––––––"
                                                placeholderTextColor="#8d8a87"
                                                value={code}
                                                onChangeText={setCode}
                                                keyboardType="number-pad"
                                                maxLength={8}
                                                autoFocus
                                                style={{ paddingVertical: 0, letterSpacing: 8, textAlignVertical: 'center', includeFontPadding: false }}
                                            />
                                        </View>
                                        <Pressable onPress={handleSendCode} className="self-end mt-3" hitSlop={8}>
                                            <Text className="text-caption font-labelbold text-accent">Renvoyer le code</Text>
                                        </Pressable>
                                    </View>
                                )}

                                {/* Name asked only on the step where an account is actually created */}
                                {codeSent && (
                                    <View className="mb-5">
                                        <Text className="text-eyebrow font-label tracking-[0.08em] uppercase text-ink-faint mb-3">
                                            Votre nom (optionnel)
                                        </Text>
                                        <View className="bg-white rounded-card border border-hairline px-5 h-16 flex-row items-center gap-4">
                                            <User color="#8d8a87" size={20} />
                                            <TextInput
                                                className="flex-1 text-ink text-bodylg font-body"
                                                placeholder="Comment vous appeler ?"
                                                placeholderTextColor="#8d8a87"
                                                value={fullName}
                                                onChangeText={setFullName}
                                                autoCapitalize="words"
                                                style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                            />
                                        </View>
                                    </View>
                                )}
                            </>
                        )}

                        {/* ---- Email / password ---- */}
                        {mode === 'email' && isSignUp && (
                            <View className="mb-5">
                                <Text className="text-eyebrow font-label tracking-[0.08em] uppercase text-ink-faint mb-3">Nom complet</Text>
                                <View className="bg-white rounded-card border border-hairline px-5 h-16 flex-row items-center gap-4">
                                    <User color="#8d8a87" size={20} />
                                    <TextInput
                                        className="flex-1 text-ink text-bodylg font-body"
                                        placeholder="Moustapha Abdallah"
                                        placeholderTextColor="#8d8a87"
                                        value={fullName}
                                        onChangeText={setFullName}
                                        autoCapitalize="words"
                                        style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Email */}
                        {mode === 'email' && (
                        <View className="mb-5">
                            <Text className="text-eyebrow font-label tracking-[0.08em] uppercase text-ink-faint mb-3">Adresse email</Text>
                            <View className="bg-white rounded-card border border-hairline px-5 h-16 flex-row items-center gap-4">
                                <Mail color="#8d8a87" size={20} />
                                <TextInput
                                    className="flex-1 text-ink text-bodylg font-body"
                                    placeholder="votre@email.com"
                                    placeholderTextColor="#8d8a87"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                />
                            </View>
                        </View>
                        )}

                        {/* Password */}
                        {mode === 'email' && (
                        <View className="mb-5">
                            <Text className="text-eyebrow font-label tracking-[0.08em] uppercase text-ink-faint mb-3">Mot de passe</Text>
                            <View className="bg-white rounded-card border border-hairline px-5 h-16 flex-row items-center gap-4">
                                <Lock color="#8d8a87" size={20} />
                                <TextInput
                                    className="flex-1 text-ink text-bodylg font-body"
                                    placeholder="••••••••"
                                    placeholderTextColor="#8d8a87"
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
                                        ? <EyeOff color="#8d8a87" size={20} />
                                        : <Eye color="#8d8a87" size={20} />
                                    }
                                </Pressable>
                            </View>
                        </View>
                        )}

                        {/* Forgot password */}
                        {mode === 'email' && !isSignUp && (
                            <Pressable className="self-end mb-8" onPress={handleForgotPassword} hitSlop={8}>
                                <Text className="text-caption font-labelbold text-accent">Mot de passe oublié ?</Text>
                            </Pressable>
                        )}

                        {/* Error (server or client-side validation) */}
                        {(error || formError) && (
                            <View
                                className="bg-danger-soft rounded-card px-5 py-4 mb-6"
                                style={{ borderWidth: 1, borderColor: 'rgba(186,26,26,0.2)' }}
                            >
                                <Text className="text-danger text-body font-body">{error || formError}</Text>
                            </View>
                        )}

                        {/* Positive notice (email sent, account created…) */}
                        {notice && (
                            <View className="bg-white border border-hairline rounded-card px-5 py-4 mb-6 flex-row items-center gap-3">
                                <MailCheck color="#22c55e" size={18} />
                                <Text className="flex-1 text-ink-muted text-body font-body leading-relaxed">{notice}</Text>
                            </View>
                        )}

                        {/* Submit Button */}
                        <Pressable
                            onPress={mode === 'phone' ? (codeSent ? handleVerifyCode : handleSendCode) : handleAuth}
                            disabled={loading}
                            className="bg-accent h-16 rounded-card flex-row items-center justify-center active:scale-[0.98] mb-6"
                            style={{ ...shadowFloat, opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <View className="flex-row items-center gap-3">
                                    <Text className="text-white font-labelbold text-body">
                                        {mode === 'phone'
                                            ? (codeSent ? 'Vérifier le code' : 'Recevoir le code')
                                            : isSignUp ? 'Créer le compte' : 'Se connecter'}
                                    </Text>
                                    <ChevronRight color="#fff" size={20} />
                                </View>
                            )}
                        </Pressable>

                        {/* Sign in / sign up toggle — email only; with a phone number
                            the first sign-in creates the account, so there is no choice
                            to present. */}
                        {mode === 'email' && (
                            <>
                                <View className="flex-row items-center gap-4 my-4">
                                    <View className="flex-1 h-px bg-hairline" />
                                    <Text className="text-eyebrow font-label tracking-[0.08em] uppercase text-ink-faint">ou</Text>
                                    <View className="flex-1 h-px bg-hairline" />
                                </View>

                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setIsSignUp(!isSignUp);
                                        resetFeedback();
                                    }}
                                    className="py-4 items-center"
                                >
                                    <Text className="text-ink-muted text-body font-body">
                                        {isSignUp ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
                                        <Text className="text-accent font-labelbold">{isSignUp ? 'Se connecter' : "S'inscrire"}</Text>
                                    </Text>
                                </Pressable>
                            </>
                        )}

                        {/* Skip */}
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.replace('/home');
                            }}
                            className="py-3 items-center mb-8"
                        >
                            <Text className="text-ink-faint text-caption font-label">Continuer sans compte →</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
