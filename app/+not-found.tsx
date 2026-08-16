import { View, Text, Pressable } from 'react-native';
import { router, Stack } from 'expo-router';
import { Compass } from 'lucide-react-native';

import { COLORS } from '../src/lib/palette';

/**
 * Fallback for any URL that matches no route — most often a deep link from a
 * notification, a Live Activity or a shared link pointing at a screen that has
 * moved. Without it, expo-router shows its bare developer "Unmatched Route"
 * page, which reads as a broken app to a customer.
 */
export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View className="flex-1 bg-background items-center justify-center px-10">
                <View className="w-20 h-20 rounded-full items-center justify-center mb-6" style={{ backgroundColor: COLORS.accentSoft }}>
                    <Compass color={COLORS.accent} size={32} />
                </View>
                <Text className="text-h3 font-title tracking-tight text-ink text-center">
                    Cette page n'existe pas
                </Text>
                <Text className="text-body font-body text-ink-muted text-center mt-2 leading-relaxed">
                    Le lien que vous avez suivi est introuvable ou a expiré.
                </Text>
                <Pressable
                    onPress={() => router.replace('/home')}
                    className="bg-ink px-8 py-4 rounded-full mt-8 active:scale-95"
                >
                    <Text className="text-white text-caption font-labelbold">Retour à l'accueil</Text>
                </Pressable>
            </View>
        </>
    );
}
