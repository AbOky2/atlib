import { Alert, Linking } from 'react-native';
import { BRAND_FULL } from './brand';

/** Configure the real support number at build time, in international format. */
export const SUPPORT_PHONE = (process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '').replace(/[^0-9]/g, '');

export const SUPPORT_DEFAULT_MESSAGE = `Bonjour, j'ai besoin d'aide avec ${BRAND_FULL}.`;
export const SUPPORT_ORDER_MESSAGE = "Bonjour, j'ai besoin d'aide avec ma commande.";

/**
 * Open WhatsApp support. Tries the native app first, then falls back to the
 * universal wa.me link (browser) so users without WhatsApp installed are never
 * met with a button that silently does nothing.
 */
export async function openSupportChat(message: string = SUPPORT_DEFAULT_MESSAGE): Promise<void> {
    if (!/^235[0-9]{8}$/.test(SUPPORT_PHONE)) {
        Alert.alert('Support indisponible', 'Le contact du support sera disponible prochainement.');
        return;
    }
    const text = encodeURIComponent(message);
    try {
        await Linking.openURL(`whatsapp://send?phone=+${SUPPORT_PHONE}&text=${text}`);
    } catch {
        await Linking.openURL(`https://wa.me/${SUPPORT_PHONE}?text=${text}`).catch(() => { Alert.alert('Ouverture impossible', 'Vérifiez votre connexion et réessayez.'); });
    }
}
