import React from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';

import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { Button, TypeText, SCREEN_GUTTER } from '../../src/components/ui';
import { PRIVACY_POLICY, PRIVACY_UPDATED_AT, type LegalSection } from '../../src/lib/legal';
import { openSupportChat } from '../../src/lib/support';

/**
 * The privacy policy, readable without leaving the app (App Store 5.1.1, Play
 * Data safety). Content lives in src/lib/legal.ts — the same source renders the
 * hosted page the store listings point to.
 */
export default function PrivacyScreen() {
    const headerOffset = useHeaderOffset();
    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Confidentialité" back="arrow" onBack={() => router.back()} />
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: headerOffset + 24, paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
            >
                <TypeText variant="eyebrow" tone="tertiary" className="mb-2">Mise à jour le {PRIVACY_UPDATED_AT}</TypeText>
                <TypeText variant="h1" className="mb-8">Politique de confidentialité</TypeText>

                {PRIVACY_POLICY.map((section) => (
                    <Section key={section.title} section={section} />
                ))}

                <Button
                    label="Une question ? Contacter l'assistance"
                    variant="secondary"
                    onPress={() => { void openSupportChat("Bonjour, j'ai une question sur mes données personnelles."); }}
                    className="mt-4"
                />
            </ScrollView>
        </View>
    );
}

function Section({ section }: { section: LegalSection }) {
    return (
        <View className="mb-8">
            <TypeText variant="h3" className="mb-3">{section.title}</TypeText>
            {section.paragraphs.map((paragraph) => (
                <TypeText key={paragraph} tone="secondary" className="mb-3">{paragraph}</TypeText>
            ))}
            {section.bullets?.map((bullet) => (
                <View key={bullet} className="flex-row mb-2 pr-2" style={{ gap: 12 }}>
                    {/* 6 pt disc aligned on the first line's x-height, not the block centre. */}
                    <View className="w-1.5 h-1.5 rounded-full bg-ink-faint mt-2" />
                    <TypeText tone="secondary" className="flex-1">{bullet}</TypeText>
                </View>
            ))}
        </View>
    );
}
