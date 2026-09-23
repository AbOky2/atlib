import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Mail, Lock, Eye, EyeOff, User, MailCheck, Phone, KeyRound } from 'lucide-react-native';

import { PHONE_SIGN_IN_ENABLED } from '../src/lib/authFeatures';
import { useAuthStore } from '../src/store/authStore';
import { isValidSmsCode, SMS_CODE_LENGTH, smsResendSeconds } from '../src/lib/phoneAuth';
import { isValidChadPhone, formatChadPhone } from '../src/lib/phone';
import { BRAND, BRAND_TAGLINE, BRAND_FULL } from '../src/lib/brand';
import { Button, Field, TypeText, SCREEN_GUTTER, TOUCH_MIN } from '../src/components/ui';
import { COLORS } from '../src/lib/palette';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One phone flow supports both registration and returning customers. */
type AuthMode = 'phone' | 'email';

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const [mode, setMode] = useState<AuthMode>('email');
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

    const { signIn, signUp, requestPhoneCode, verifyPhoneCode, requestPasswordReset, loading, error, clearError, phoneCodeResendAt } = useAuthStore();
    const [now, setNow] = useState(Date.now());
    const resendSeconds = smsResendSeconds(phoneCodeResendAt, now);
    useEffect(() => {
        if (!PHONE_SIGN_IN_ENABLED) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const resetFeedback = () => {
        setFormError(null);
        setNotice(null);
        clearError();
    };

    const switchMode = (next: AuthMode) => {
        if (loading || (next === 'phone' && !PHONE_SIGN_IN_ENABLED)) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        resetFeedback();
        setMode(next);
        setCodeSent(false);
        setCode('');
    };

    const handleSendCode = async () => {
        if (loading || Date.now() < phoneCodeResendAt) return;
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
            setCode('');
            setNow(Date.now());
            setCodeSent(true);
            setNotice(`Code envoyé au ${formatChadPhone(phone)}.`);
        }
    };

    const handleVerifyCode = async () => {
        if (loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        resetFeedback();
        if (!isValidSmsCode(code)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setFormError('Saisissez les 6 chiffres reçus par SMS.');
            return;
        }
        const result = await verifyPhoneCode(phone, code, fullName);
        if (result === 'ok') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/home');
        }
    };

    const handleAuth = async () => {
        if (loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        resetFeedback();

        if (!EMAIL_REGEX.test(email.trim())) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setFormError('Saisissez une adresse email valide.');
            return;
        }

        if (isSignUp ? password.length < 8 : !password.length) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setFormError(isSignUp ? 'Choisissez un mot de passe de 8 caractères minimum.' : 'Saisissez votre mot de passe.');
            return;
        }

        const result = isSignUp
            ? await signUp(email.trim(), password, fullName.trim() || undefined)
            : await signIn(email.trim(), password);

        if (result === 'confirm-email') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setNotice('Vérifiez votre boîte mail et ouvrez le lien de confirmation depuis ce téléphone pour terminer votre inscription.');
            setIsSignUp(false);
            return;
        }

        if (result === 'ok') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
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
            setNotice(`Email de réinitialisation envoyé à ${email.trim()}. Ouvrez le lien depuis ce téléphone.`);
        }
    };

    const submitLabel = mode === 'phone'
        ? (codeSent ? 'Valider et continuer' : resendSeconds > 0 ? `Nouveau code dans ${resendSeconds} s` : 'Recevoir mon code SMS')
        : isSignUp ? 'Créer le compte' : 'Se connecter';

    return (
        <View className="flex-1 bg-background">
            {/* Single calm ambient glow */}
            <View pointerEvents="none" className="absolute rounded-full bg-accent/10" style={{ width: 480, height: 480, top: -160, right: -160 }} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: SCREEN_GUTTER, paddingTop: Math.max(insets.top + 48, 72), paddingBottom: Math.max(insets.bottom, 24) }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Brand */}
                    <View className="flex-row items-end gap-1 mb-8" accessible accessibilityRole="header" accessibilityLabel={`${BRAND}, ${BRAND_TAGLINE}`}>
                        <Text className="text-display font-display tracking-tighter text-ink">{BRAND}</Text>
                        <View className="w-2 h-2 rounded-full bg-accent mb-3" />
                    </View>

                    {/* Title */}
                    <Text className="text-h1 font-title tracking-tight text-ink mb-2" accessibilityRole="header">
                        {mode === 'phone'
                            ? (codeSent ? 'Votre code de connexion' : 'Votre compte, votre numéro')
                            : isSignUp ? 'Créez votre compte' : 'Bon retour parmi nous'}
                    </Text>
                    <TypeText variant="bodylg" tone="secondary" className="mb-8">
                        {mode === 'phone'
                            ? (codeSent
                                ? `Entrez le code à 6 chiffres envoyé au ${formatChadPhone(phone)}.`
                                : 'Créez votre compte ou retrouvez-le avec un code SMS.')
                            : isSignUp
                                ? `Rejoignez ${BRAND_FULL} pour commander en quelques gestes.`
                                : 'Connectez-vous pour commander vos plats préférés.'}
                    </TypeText>

                    {/* Phone sign-in is reserved for a future release. */}
                    {PHONE_SIGN_IN_ENABLED && (
                        <View className="flex-row bg-fill rounded-card p-1 mb-6">
                            {(['phone', 'email'] as AuthMode[]).map((m) => (
                                <Pressable
                                    key={m}
                                    onPress={() => switchMode(m)}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: mode === m }}
                                    className={`flex-1 rounded-chip items-center justify-center flex-row gap-2 ${mode === m ? 'bg-surface' : ''}`}
                                    style={{ height: TOUCH_MIN }}
                                >
                                    {m === 'phone'
                                        ? <Phone color={mode === m ? COLORS.ink : COLORS.inkFaint} size={16} strokeWidth={2} />
                                        : <Mail color={mode === m ? COLORS.ink : COLORS.inkFaint} size={16} strokeWidth={2} />}
                                    <Text className={`text-label font-labelbold ${mode === m ? 'text-ink' : 'text-ink-faint'}`}>
                                        {m === 'phone' ? 'Téléphone' : 'Avec un email'}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    {/* ---- Phone (SMS code) ---- */}
                    {PHONE_SIGN_IN_ENABLED && mode === 'phone' && (
                        <>
                            <Field
                                label="Numéro de téléphone"
                                icon={Phone}
                                placeholder="66 12 34 56"
                                value={phone}
                                onChangeText={(v) => { setPhone(v); if (codeSent) setCodeSent(false); }}
                                keyboardType="phone-pad"
                                editable={!codeSent && !loading}
                                autoComplete="tel"
                                textContentType="telephoneNumber"
                                maxLength={20}
                                helper="Indicatif +235 ajouté automatiquement."
                                className="mb-5"
                            />
                            {codeSent && (
                                <Field
                                    label="Code reçu par SMS"
                                    icon={KeyRound}
                                    placeholder="––––––"
                                    value={code}
                                    onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, SMS_CODE_LENGTH))}
                                    keyboardType="number-pad"
                                    maxLength={SMS_CODE_LENGTH}
                                    autoComplete="sms-otp"
                                    textContentType="oneTimeCode"
                                    editable={!loading}
                                    autoFocus
                                    className="mb-2"
                                />
                            )}
                            {codeSent && (
                                <Pressable
                                    disabled={loading || resendSeconds > 0}
                                    accessibilityRole="button"
                                    onPress={handleSendCode}
                                    className="self-end mb-5 justify-center px-2"
                                    style={{ minHeight: TOUCH_MIN }}
                                >
                                    <Text className="text-caption font-labelbold text-accent-dark">{resendSeconds > 0 ? `Renvoyer dans ${resendSeconds} s` : 'Renvoyer le code'}</Text>
                                </Pressable>
                            )}
                            {codeSent && (
                                <Field
                                    label="Votre nom (optionnel)"
                                    icon={User}
                                    placeholder="Comment vous appeler ?"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                    maxLength={120}
                                    className="mb-5"
                                />
                            )}
                        </>
                    )}

                    {/* ---- Email / password ---- */}
                    {mode === 'email' && (
                        <>
                            {isSignUp && (
                                <Field
                                    label="Nom complet"
                                    icon={User}
                                    placeholder="Moustapha Abdallah"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                    autoComplete="name"
                                    textContentType="name"
                                    maxLength={120}
                                    className="mb-5"
                                />
                            )}
                            <Field
                                label="Adresse email"
                                icon={Mail}
                                placeholder="votre@email.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="email"
                                textContentType="emailAddress"
                                className="mb-5"
                            />
                            <Field
                                label="Mot de passe"
                                icon={Lock}
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                textContentType={isSignUp ? 'newPassword' : 'password'}
                                helper={isSignUp ? '8 caractères minimum.' : undefined}
                                trailing={
                                    <Pressable
                                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPassword((v) => !v); }}
                                        accessibilityRole="button"
                                        accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                        className="items-center justify-center"
                                        style={{ width: TOUCH_MIN, height: TOUCH_MIN }}
                                    >
                                        {showPassword ? <EyeOff color={COLORS.inkFaint} size={20} strokeWidth={2} /> : <Eye color={COLORS.inkFaint} size={20} strokeWidth={2} />}
                                    </Pressable>
                                }
                                className={isSignUp ? 'mb-5' : 'mb-2'}
                            />
                            {!isSignUp && (
                                <Pressable
                                    className="self-end mb-6 justify-center px-2"
                                    style={{ minHeight: TOUCH_MIN }}
                                    onPress={handleForgotPassword}
                                    accessibilityRole="button"
                                >
                                    <Text className="text-caption font-labelbold text-accent-dark">Mot de passe oublié ?</Text>
                                </Pressable>
                            )}
                        </>
                    )}

                    {/* Error (server or client-side validation) */}
                    {(error || formError) && (
                        <View className="bg-danger-soft rounded-card px-5 py-4 mb-6" accessibilityRole="alert" accessibilityLiveRegion="assertive">
                            <TypeText tone="danger">{error || formError}</TypeText>
                        </View>
                    )}

                    {/* Positive notice (email sent, account created…) */}
                    {notice && (
                        <View className="bg-surface border border-hairline rounded-card px-5 py-4 mb-6 flex-row items-center gap-3" accessibilityRole="alert" accessibilityLiveRegion="polite">
                            <MailCheck color={COLORS.success} size={20} strokeWidth={2} />
                            <TypeText tone="secondary" className="flex-1">{notice}</TypeText>
                        </View>
                    )}

                    <Button
                        label={submitLabel}
                        onPress={mode === 'phone' ? (codeSent ? handleVerifyCode : handleSendCode) : handleAuth}
                        loading={loading}
                        disabled={mode === 'phone' && !codeSent && resendSeconds > 0}
                        className="mb-4"
                    />

                    {mode === 'email' && isSignUp && (
                        <Text className="text-caption font-body text-ink-faint text-center mb-4">
                            En créant un compte, vous acceptez notre{' '}
                            <Text className="text-ink font-labelbold" accessibilityRole="link" onPress={() => router.push('/privacy')}>politique de confidentialité</Text>.
                        </Text>
                    )}

                    {/* Sign in / sign up toggle — email only; with a phone number
                        the first sign-in creates the account, so there is no choice
                        to present. */}
                    {mode === 'email' && (
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setIsSignUp(!isSignUp);
                                resetFeedback();
                            }}
                            accessibilityRole="button"
                            className="items-center justify-center"
                            style={{ minHeight: TOUCH_MIN }}
                        >
                            <Text className="text-ink-muted text-body font-body">
                                {isSignUp ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
                                <Text className="text-accent-dark font-labelbold">{isSignUp ? 'Se connecter' : 'S’inscrire'}</Text>
                            </Text>
                        </Pressable>
                    )}

                    <View className="flex-1" />

                    {/* Skip */}
                    <Button label="Continuer sans compte" variant="ghost" size="control" onPress={() => router.replace('/home')} className="mt-6" />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
