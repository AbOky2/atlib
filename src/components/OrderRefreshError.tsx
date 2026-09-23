import { View } from 'react-native';
import { Button, TypeText } from './ui';

/** Cached orders remain readable when a refresh fails; never imply freshness. */
export function OrderRefreshError({ busy, retry }: { busy: boolean; retry: () => void }) {
    return (
        <View className="bg-fill rounded-card p-4 my-3 gap-3" accessibilityRole="alert">
            <TypeText>Impossible d’actualiser les commandes. Les informations affichées peuvent avoir changé.</TypeText>
            <View className="self-start">
                <Button label="Réessayer" size="control" loading={busy} onPress={retry} />
            </View>
        </View>
    );
}
