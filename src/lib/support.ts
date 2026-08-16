import { Linking } from 'react-native';
import { BRAND_FULL } from './brand';

/**
 * Single source of truth for customer support contact.
 *
 * ⚠️ TODO(prod): replace with the real support number before launch — this
 * placeholder was previously duplicated (and already diverging) between
 * tracking.tsx and profile.tsx.
 */
export const SUPPORT_PHONE = '23566000000';

export const SUPPORT_DEFAULT_MESSAGE = `Bonjour, j'ai besoin d'aide avec ${BRAND_FULL}.`;
export const SUPPORT_ORDER_MESSAGE = "Bonjour, j'ai besoin d'aide avec ma commande.";

/**
 * Open WhatsApp support. Tries the native app first, then falls back to the
 * universal wa.me link (browser) so users without WhatsApp installed are never
 * met with a button that silently does nothing.
 */
export async function openSupportChat(message: string = SUPPORT_DEFAULT_MESSAGE): Promise<void> {
    const text = encodeURIComponent(message);
    try {
        await Linking.openURL(`whatsapp://send?phone=+${SUPPORT_PHONE}&text=${text}`);
    } catch {
        Linking.openURL(`https://wa.me/${SUPPORT_PHONE}?text=${text}`).catch(() => {});
    }
}
