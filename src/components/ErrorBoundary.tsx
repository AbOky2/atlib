import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props {
    children: React.ReactNode;
}
interface State {
    hasError: boolean;
}

/**
 * Catches render/runtime errors anywhere in the tree and shows a recoverable
 * fallback instead of white-screening the whole app. Mount it near the root.
 * Hook up Sentry (or similar) in componentDidCatch for production visibility.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // TODO(prod): Sentry.captureException(error, { extra: info });
        console.error('[ErrorBoundary]', error, info?.componentStack);
    }

    reset = () => this.setState({ hasError: false });

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <View className="flex-1 bg-background items-center justify-center px-8">
                <Text className="text-display mb-4">😕</Text>
                <Text className="text-h3 font-title text-ink text-center">
                    Oups, un problème est survenu
                </Text>
                <Text className="text-body text-ink-muted font-body text-center mt-2 leading-relaxed">
                    Une erreur inattendue s'est produite. Réessayez — vos données sont en sécurité.
                </Text>
                <Pressable
                    onPress={this.reset}
                    className="bg-ink px-8 py-4 rounded-full mt-8 active:scale-95"
                >
                    <Text className="text-white text-caption font-labelbold uppercase tracking-[0.08em]">Réessayer</Text>
                </Pressable>
            </View>
        );
    }
}
