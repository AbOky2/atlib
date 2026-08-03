import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { Star, Send, MessageSquare, CheckCircle2 } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { useRestaurant } from '../../src/hooks/useSupabase';
import { useAuthStore } from '../../src/store/authStore';
import { useCartStore } from '../../src/store/cartStore';

export default function ReviewsScreen() {
    const headerOffset = useHeaderOffset();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: restaurant } = useRestaurant(id ?? '');
    const user = useAuthStore(state => state.user);
    const showToast = useCartStore(state => state.showToast);

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // Simulated reviews (would come from a reviews table in Supabase)
    const mockReviews = [
        {
            id: '1',
            userName: 'Aïcha M.',
            rating: 5,
            comment: 'La meilleure nourriture tchadienne de N\'Djamena ! Les grillades sont incroyables.',
            date: '2026-03-20',
        },
        {
            id: '2',
            userName: 'Ibrahim K.',
            rating: 4,
            comment: 'Très bon service. La livraison était rapide.',
            date: '2026-03-18',
        },
        {
            id: '3',
            userName: 'Fatima A.',
            rating: 5,
            comment: 'Portions généreuses et plats authentiques. Je recommande !',
            date: '2026-03-15',
        },
    ];

    const handleSubmitReview = () => {
        if (rating === 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast('Veuillez sélectionner une note avant de soumettre.', 'error');
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSubmitted(true);
        showToast('Votre avis a été soumis avec succès. 🎉', 'success');
    };

    const averageRating = mockReviews.reduce((acc, r) => acc + r.rating, 0) / mockReviews.length;

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Avis" back="arrow" onBack={() => router.back()} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: headerOffset,
                    paddingBottom: 40,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="px-6 pb-10">
                    {/* Restaurant Summary */}
                    {restaurant && (
                        <View className="bg-white rounded-3xl p-6 border border-surface-container-highest mb-8">
                            <View className="flex-row items-center gap-4">
                                <View className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-container-highest">
                                    <Image source={{ uri: restaurant.image_url ?? '' }} className="w-full h-full" resizeMode="cover" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-lg font-bold font-manrope text-[#1c1b1b]">{restaurant.name}</Text>
                                    <View className="flex-row items-center gap-2 mt-1">
                                        <View className="flex-row items-center gap-1">
                                            <Star fill="#FF5733" color="#FF5733" size={16} />
                                            <Text className="text-sm font-black text-[#1c1b1b] font-inter">{averageRating.toFixed(1)}</Text>
                                        </View>
                                        <Text className="text-xs text-[#747878] font-inter">({mockReviews.length} avis)</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Write Review */}
                    {user && !submitted && (
                        <View className="bg-white rounded-3xl p-6 border border-surface-container-highest mb-8">
                            <Text className="text-[10px] font-bold tracking-[2px] uppercase text-[#747878] font-inter mb-4">Laisser un avis</Text>

                            {/* Star Rating */}
                            <View className="flex-row items-center gap-2 mb-5">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Pressable
                                        key={star}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setRating(star);
                                        }}
                                    >
                                        <Star
                                            fill={star <= rating ? '#FF5733' : 'transparent'}
                                            color={star <= rating ? '#FF5733' : '#a8a29e'}
                                            size={32}
                                        />
                                    </Pressable>
                                ))}
                                {rating > 0 && (
                                    <Text className="text-sm font-bold text-[#FF5733] ml-2 font-inter">{rating}/5</Text>
                                )}
                            </View>

                            {/* Comment */}
                            <View className="bg-surface-container-low rounded-2xl px-4 py-3 mb-5 border border-surface-container-highest">
                                <TextInput
                                    className="text-sm text-[#1c1b1b] font-inter min-h-[80px]"
                                    placeholder="Partagez votre expérience..."
                                    placeholderTextColor="#a8a29e"
                                    multiline
                                    value={comment}
                                    onChangeText={setComment}
                                    textAlignVertical="top"
                                />
                            </View>

                            <Pressable
                                onPress={handleSubmitReview}
                                disabled={rating === 0}
                                className={`bg-[#FF5733] py-4 rounded-full flex-row items-center justify-center gap-2 active:scale-[0.98] ${rating === 0 ? 'opacity-50' : ''}`}
                            >
                                <Text className="text-white font-bold text-sm tracking-widest uppercase font-inter">Envoyer</Text>
                                <Send color="#fff" size={16} />
                            </Pressable>
                        </View>
                    )}

                    {/* Confirmation after submit */}
                    {user && submitted && (
                        <View className="bg-white rounded-2xl p-6 border border-surface-container-highest mb-8 flex-row items-center gap-3">
                            <CheckCircle2 color="#16a34a" size={24} />
                            <Text className="text-base font-bold font-manrope text-[#1c1b1b]">Merci pour votre avis !</Text>
                        </View>
                    )}

                    {/* Review List */}
                    <View>
                        <Text className="font-manrope font-bold text-xl mb-6 tracking-tight text-[#1c1b1b]">Ce qu'en pensent les clients</Text>

                        {mockReviews.length === 0 ? (
                            <View className="items-center py-10">
                                <MessageSquare color="#a8a29e" size={48} />
                                <Text className="text-[#747878] font-inter mt-4 text-center">Aucun avis pour le moment.{'\n'}Soyez le premier !</Text>
                            </View>
                        ) : (
                            <View className="flex-col gap-4">
                                {mockReviews.map((rev) => (
                                    <View key={rev.id} className="bg-white p-5 rounded-2xl border border-surface-container-highest">
                                        <View className="flex-row justify-between items-start mb-3">
                                            <View className="flex-row items-center gap-3">
                                                <View className="w-10 h-10 rounded-full bg-surface-container-highest items-center justify-center border border-surface-container-highest">
                                                    <Text className="text-[#1c1b1b] font-bold font-manrope">{rev.userName.charAt(0)}</Text>
                                                </View>
                                                <View>
                                                    <Text className="font-bold text-[#1c1b1b] font-inter">{rev.userName}</Text>
                                                    <Text className="text-[10px] text-[#747878] font-inter mt-0.5">{new Date(rev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                                                </View>
                                            </View>
                                            <View className="flex-row items-center gap-1 bg-surface-container-low px-2 py-1 rounded-lg">
                                                <Star fill="#FF5733" color="#FF5733" size={12} />
                                                <Text className="text-xs font-bold text-[#1c1b1b]">{rev.rating}</Text>
                                            </View>
                                        </View>
                                        <Text className="text-[#747878] text-sm leading-relaxed font-inter">{rev.comment}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}
