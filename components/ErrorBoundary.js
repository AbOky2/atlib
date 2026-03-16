import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
                    <View className="bg-red-50 p-6 rounded-2xl w-full items-center">
                        <Text className="text-4xl mb-4">⚠️</Text>
                        <Text className="text-xl font-bold text-red-800 mb-2">Oups, une erreur est survenue</Text>
                        <Text className="text-sm text-red-600 text-center mb-6">
                            Nous avons rencontré un problème inattendu.
                        </Text>
                        <TouchableOpacity
                            className="bg-red-800 px-6 py-3 rounded-xl"
                            onPress={() => this.setState({ hasError: false, error: null })}
                        >
                            <Text className="text-white font-bold">Réessayer</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
