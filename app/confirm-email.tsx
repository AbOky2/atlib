import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { confirmEmail } from '../src/data/emailConfirmation';
import { parseEmailConfirmationLink } from '../src/lib/emailConfirmation';
import { Button, TypeText, SCREEN_GUTTER } from '../src/components/ui';
import { ScreenHeader, useHeaderOffset } from '../src/components/ScreenHeader';
import { BRAND } from '../src/lib/brand';
import { COLORS } from '../src/lib/palette';

/**
 * Native landing of the signup email. The address is confirmed by Supabase
 * before the redirect; what happens here is the exchange of the one-time code
 * for a session, which only succeeds on the device that signed up.
 */
export default function ConfirmEmailScreen() {
    const url = Linking.useURL();
    const headerOffset = useHeaderOffset();
    const exchange = useRef<{ url: string; promise: ReturnType<typeof confirmEmail> } | null>(null);
    const [state, setState] = useState<'waiting' | 'busy' | 'confirmed' | 'error'>('waiting');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!url) return;
        const credentials = parseEmailConfirmationLink(url);
        if (!credentials) {
            setState('error');
            setMessage('Ce lien est invalide ou a expiré. Si votre adresse est déjà confirmée, connectez-vous avec votre email et votre mot de passe.');
            return;
        }
        let mounted = true;
        setState('busy');
        // Reuse the exchange during Strict Mode effect replay: codes are single-use.
        if (exchange.current?.url !== url) exchange.current = { url, promise: confirmEmail(credentials) };
        void Promise.resolve(exchange.current.promise).then(({ data, error }) => {
            if (!mounted) return;
            if (error || !data.session || !data.user?.email_confirmed_at) {
                setState('error');
                setMessage('Votre adresse est confirmée, mais ce téléphone ne peut pas ouvrir la session : le lien doit être ouvert sur l’appareil où vous avez créé le compte. Connectez-vous avec votre email et votre mot de passe.');
            } else setState('confirmed');
        }).catch(() => {
            if (!mounted) return;
            setState('error');
            setMessage('Connexion impossible. Vérifiez votre connexion internet et rouvrez le lien de votre email.');
        });
        return () => { mounted = false; };
    }, [url]);

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Confirmation de l’email" back="arrow" onBack={() => router.replace('/login')} />
            <ScrollView contentContainerStyle={{ padding: SCREEN_GUTTER, paddingTop: headerOffset + 24, gap: 20 }}>
                {state === 'busy' ? (
                    <View className="flex-row items-center gap-3">
                        <ActivityIndicator color={COLORS.ink} />
                        <TypeText>Confirmation en cours…</TypeText>
                    </View>
                ) : null}
                {state === 'waiting' ? <TypeText>Ouvrez le lien reçu par email pour confirmer votre adresse.</TypeText> : null}
                {state === 'confirmed' ? (
                    <>
                        <TypeText variant="h2">Bienvenue sur {BRAND} !</TypeText>
                        <TypeText tone="secondary">Votre adresse email est confirmée. Vous pouvez commander.</TypeText>
                        <Button label="Continuer" onPress={() => router.replace('/home')} />
                    </>
                ) : null}
                {state === 'error' ? <TypeText tone="danger" accessibilityRole="alert">{message}</TypeText> : null}
                {state !== 'confirmed' && state !== 'busy' ? (
                    <Button label="Retour à la connexion" variant="secondary" onPress={() => router.replace('/login')} />
                ) : null}
            </ScrollView>
        </View>
    );
}
