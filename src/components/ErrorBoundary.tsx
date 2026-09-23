import React from 'react';
import { View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

import { Button, EmptyState } from './ui';
import { queryClient } from '../lib/queryClient';
import { openSupportChat } from '../lib/support';

interface Props {
    children: React.ReactNode;
}
interface State {
    hasError: boolean;
}

/**
 * Catches render/runtime errors anywhere in the tree and shows a recoverable
 * fallback instead of white-screening the whole app. Mount it near the root.
 *
 * « Réessayer » does not just re-render the same tree: it also drops the
 * query cache, so data that provoked the crash is fetched again rather than
 * replayed. Production visibility (a crash reporter) is a deliberate later
 * step: it needs a native rebuild and a DSN, and belongs to the release plan.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info?.componentStack);
    }

    reset = () => {
        queryClient.clear();
        this.setState({ hasError: false });
    };

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <EmptyState
                    icon={TriangleAlert}
                    title="Un problème est survenu"
                    message="L’écran n’a pas pu s’afficher. Réessayez : votre panier et vos commandes sont conservés."
                    action={
                        <View className="" style={{ gap: 8 }}>
                            <Button label="Réessayer" onPress={this.reset} />
                            <Button label="Contacter l’assistance" variant="ghost" size="control" onPress={() => { void openSupportChat("Bonjour, l'application affiche une erreur."); }} />
                        </View>
                    }
                />
            </View>
        );
    }
}
