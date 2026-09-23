import { useEffect, useRef, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { beginPasswordRecovery, saveRecoveredPassword } from '../src/data/passwordRecovery';
import { parseRecoveryLink, passwordValidation } from '../src/lib/passwordRecovery';
import { Button, Field, TypeText, SCREEN_GUTTER } from '../src/components/ui';
import { ScreenHeader, useHeaderOffset } from '../src/components/ScreenHeader';
import { BRAND } from '../src/lib/brand';

export default function ResetPasswordScreen() {
    const url = Linking.useURL();
    const headerOffset = useHeaderOffset();
    const exchange = useRef<{ url: string; promise: ReturnType<typeof beginPasswordRecovery> } | null>(null);
    const inFlight = useRef(false);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');

    useEffect(() => {
        if (!url) return;
        setReady(false);
        const credentials = parseRecoveryLink(url);
        if (!credentials) {
            setError('Lien invalide ou expiré. Demandez un nouvel email depuis la connexion.');
            return;
        }
        let mounted = true;
        void (async () => {
            try {
                if (exchange.current?.url !== url) {
                    exchange.current = { url, promise: beginPasswordRecovery(credentials) };
                }
                const result = await exchange.current.promise;
                if (!mounted) return;
                if (result.error || !result.data.session) {
                    setError('Ce lien a expiré, a déjà été utilisé, ou a été ouvert sur un autre téléphone que celui de la demande. Demandez un nouvel email depuis cet appareil.');
                } else { setError(null); setReady(true); }
            } catch { if (mounted) setError('Connexion impossible. Rouvrez le lien pour réessayer.'); }
        })();
        return () => { mounted = false; };
    }, [url]);

    const save = async () => {
        if (!ready || inFlight.current) return;
        const invalid = passwordValidation(password, confirmation);
        if (invalid) { setError(invalid); return; }
        inFlight.current = true; setBusy(true); setError(null);
        try {
            const { error } = await saveRecoveredPassword(password);
            if (error) { setError('Enregistrement refusé. Choisissez un autre mot de passe puis réessayez.'); return; }
            setPassword(''); setConfirmation(''); setReady(false);
            router.replace('/home');
        } catch { setError('Enregistrement impossible. Vérifiez votre connexion et réessayez.'); }
        finally { inFlight.current = false; setBusy(false); }
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Nouveau mot de passe" back="arrow" onBack={() => router.replace('/login')} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SCREEN_GUTTER, paddingTop: headerOffset + 24, gap: 20 }}>
                    <TypeText tone="secondary">Choisissez un nouveau mot de passe pour votre compte {BRAND}.</TypeText>
                    {ready ? (
                        <>
                            <Field
                                label="Nouveau mot de passe"
                                helper="8 caractères minimum."
                                secureTextEntry
                                autoComplete="new-password"
                                textContentType="newPassword"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={password}
                                onChangeText={setPassword}
                                editable={!busy}
                            />
                            <Field
                                label="Confirmer le mot de passe"
                                secureTextEntry
                                autoComplete="new-password"
                                textContentType="newPassword"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={confirmation}
                                onChangeText={setConfirmation}
                                editable={!busy}
                                error={error}
                            />
                            <Button label="Enregistrer le mot de passe" loading={busy} onPress={save} />
                        </>
                    ) : !error ? <TypeText>Ouvrez le lien de votre email de réinitialisation.</TypeText> : null}
                    {error && !ready ? <TypeText tone="danger" accessibilityRole="alert">{error}</TypeText> : null}
                    {!ready ? <Button label="Retour à la connexion" variant="secondary" onPress={() => router.replace('/login')} /> : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
