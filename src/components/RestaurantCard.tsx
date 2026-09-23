import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Star, Clock, Bike, Heart } from 'lucide-react-native';

import { RemoteImage } from './RemoteImage';
import { ClosedBadge } from './ClosedBadge';
import { isAcceptingOrders } from '../lib/availability';
import { DELIVERY_FEE_XAF, formatXaf } from '../lib/pricing';
import { COLORS } from '../lib/palette';
import { TOUCH_MIN } from './ui';

interface CardRestaurant {
    id: string;
    name: string;
    genre: string | null;
    image_url: string | null;
    rating: number | null;
    is_accepting_orders?: boolean | null;
}

/** Photo 16:10 plus a 76 pt caption; the gap between cards is 24 pt. */
export const CARD_PHOTO_RATIO = 10 / 16;
export const CARD_CAPTION_HEIGHT = 76;
export const CARD_GAP = 24;
export const cardHeight = (width: number) => Math.round(width * CARD_PHOTO_RATIO) + CARD_CAPTION_HEIGHT + CARD_GAP;

/**
 * THE restaurant card of the home screen.
 *
 * Every restaurant gets the same card, the same photo size, the same caption:
 * no featured one, no second-tier rail. The photo carries the appeal, the
 * caption carries the facts, and the only colour is the favourite heart.
 */
export function RestaurantCard({
    restaurant,
    width,
    estimate,
    favourite,
    onPress,
    onPressIn,
    onToggleFavourite,
}: {
    restaurant: CardRestaurant;
    width: number;
    estimate?: string | null;
    favourite: boolean;
    onPress: () => void;
    onPressIn?: () => void;
    onToggleFavourite: () => void;
}) {
    const open = isAcceptingOrders(restaurant);
    const photoHeight = Math.round(width * CARD_PHOTO_RATIO);

    return (
        <Pressable
            onPress={onPress}
            onPressIn={onPressIn}
            accessibilityRole="button"
            accessibilityLabel={`${restaurant.name}, ${restaurant.genre ?? 'restaurant'}${open ? '' : ', fermé'}`}
            className="active:opacity-80"
            style={{ width, marginBottom: CARD_GAP }}
        >
            <View className="rounded-panel overflow-hidden bg-fill-strong" style={{ height: photoHeight }}>
                <RemoteImage uri={restaurant.image_url} displayWidth={width} className="w-full h-full" style={{ opacity: open ? 1 : 0.5 }} />
                {!open ? (
                    <View className="absolute left-3 bottom-3"><ClosedBadge /></View>
                ) : null}
                <Pressable
                    onPress={(e) => { e.stopPropagation?.(); onToggleFavourite(); }}
                    accessibilityRole="button"
                    accessibilityLabel={favourite ? `Retirer ${restaurant.name} des favoris` : `Ajouter ${restaurant.name} aux favoris`}
                    accessibilityState={{ selected: favourite }}
                    className="absolute top-2 right-2 items-center justify-center active:scale-90"
                    style={{ width: TOUCH_MIN, height: TOUCH_MIN }}
                >
                    <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(252,249,248,0.92)' }}>
                        <Heart
                            fill={favourite ? COLORS.accent : 'transparent'}
                            color={favourite ? COLORS.accent : COLORS.ink}
                            size={18}
                            strokeWidth={2}
                        />
                    </View>
                </Pressable>
            </View>

            <View style={{ height: CARD_CAPTION_HEIGHT, paddingTop: 12 }}>
                <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
                    <Text numberOfLines={1} className="text-h3 font-title tracking-tight text-ink flex-1">{restaurant.name}</Text>
                    {restaurant.rating != null ? (
                        <View className="flex-row items-center" style={{ gap: 4, paddingTop: 3 }}>
                            <Star fill={COLORS.ink} color={COLORS.ink} size={14} strokeWidth={2} />
                            <Text className="text-label font-labelbold text-ink">{restaurant.rating}</Text>
                        </View>
                    ) : null}
                </View>
                <View className="flex-row items-center mt-1" style={{ gap: 8 }}>
                    <Text numberOfLines={1} className="text-label text-ink-muted font-body flex-shrink">{restaurant.genre ?? 'Restaurant'}</Text>
                    <View className="w-1 h-1 rounded-full bg-ink-disabled" />
                    <View className="flex-row items-center" style={{ gap: 4 }}>
                        {estimate
                            ? <Clock color={COLORS.inkFaint} size={14} strokeWidth={2} />
                            : <Bike color={COLORS.inkFaint} size={14} strokeWidth={2} />}
                        <Text className="text-label text-ink-muted font-body">{estimate ?? `Livraison ${formatXaf(DELIVERY_FEE_XAF)}`}</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}
