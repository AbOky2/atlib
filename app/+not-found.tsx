import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Compass } from 'lucide-react-native';

import { Button, EmptyState } from '../src/components/ui';

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
            <View className="flex-1 bg-background items-center justify-center">
                <EmptyState
                    icon={Compass}
                    title="Cette page n’existe pas"
                    message="Le lien que vous avez suivi est introuvable ou a expiré."
                    action={<Button label="Retour à l’accueil" onPress={() => router.replace('/home')} />}
                />
            </View>
        </>
    );
}
