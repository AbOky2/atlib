import 'react-native-url-polyfill/auto';
import { Stack } from "expo-router";
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/lib/queryClient";
import Toast from '../src/components/Toast';
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from '../src/store/authStore';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { BrandSplash } from '../src/components/BrandSplash';
import { setupReactQueryNetwork } from '../src/lib/reactQueryNetwork';

SplashScreen.preventAutoHideAsync();
setupReactQueryNetwork();

export default function RootLayout() {
    const initialize = useAuthStore(state => state.initialize);
    // Branded reveal shown once per cold start, between the native splash and the app.
    const [splashDone, setSplashDone] = useState(false);

    const [loaded, error] = useFonts({
        Manrope_400Regular,
        Manrope_500Medium,
        Manrope_600SemiBold,
        Manrope_700Bold,
        Manrope_800ExtraBold,
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        // Base-family aliases so `font-manrope` / `font-inter` (which resolve to the
        // bare family names) actually render the brand type instead of falling back
        // to the system font. Manrope reads as a bold display face; Inter carries body/labels.
        Manrope: Manrope_800ExtraBold,
        Inter: Inter_500Medium,
    });

    useEffect(() => {
        initialize();
    }, []);

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    if (!loaded && !error) {
        return null;
    }

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <>
                    <Stack screenOptions={{ headerShown: false }} />
                    <Toast />
                    {!splashDone && <BrandSplash onDone={() => setSplashDone(true)} />}
                    <StatusBar style="dark" />
                </>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
