import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Star, Clock, Bike } from 'lucide-react-native';

import { RemoteImage } from './RemoteImage';
import { ClosedBadge } from './ClosedBadge';
import { isAcceptingOrders } from '../lib/availability';
import { DELIVERY_FEE_XAF, formatXaf } from '../lib/pricing';
import { COLORS } from '../lib/palette';
import { SCREEN_GUTTER } from './ui';

/** 80 pt thumbnail + 16 pt above and below. */
export const RESTAURANT_ROW_HEIGHT = 112;

interface RowRestaurant {
    id: string;
    name: string;
    genre: string | null;
    image_url: string | null;
    rating: number | null;
    is_accepting_orders?: boolean | null;
}

/**
 * THE restaurant list item — home, explore and favourites all draw this one.
 *
 * Fixed height so lists can be virtualised and told exactly how tall a row is.
 * The third meta slot shows the delivery estimate for the customer's address
 * when one is known (a real number, from the locality table), and otherwise
 * the delivery fee — never an invented per-restaurant delay.
 */
export function RestaurantRow({
    restaurant,
    estimate,
    trailing,
    onPress,
    onPressIn,
}: {
    restaurant: RowRestaurant;
    /** « ~20 min », computed from the selected address; null when unknown. */
    estimate?: string | null;
    /** Optional 44 pt control at the end of the row (favourites use it). */
    trailing?: React.ReactNode;
    onPress: () => void;
    onPressIn?: () => void;
}) {
    const open = isAcceptingOrders(restaurant);

    return (
        <Pressable
            onPress={onPress}
            onPressIn={onPressIn}
            accessibilityRole="button"
            accessibilityLabel={`${restaurant.name}, ${restaurant.genre ?? 'restaurant'}${open ? '' : ', fermé'}`}
            className="flex-row items-center active:opacity-70"
            style={{ gap: 16, height: RESTAURANT_ROW_HEIGHT, paddingHorizontal: SCREEN_GUTTER }}
        >
            <View className="w-20 h-20 rounded-card overflow-hidden bg-fill-strong" style={{ opacity: open ? 1 : 0.45 }}>
                <RemoteImage uri={restaurant.image_url} displayWidth={80} className="w-full h-full" />
            </View>

            <View className="flex-1 justify-center">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                    <Text numberOfLines={1} className="text-bodylg font-heading tracking-tight text-ink flex-shrink">
                        {restaurant.name}
                    </Text>
                    {!open && <ClosedBadge tone="onSurface" />}
                </View>

                <Text numberOfLines={1} className="text-label text-ink-muted font-body mt-1">
                    {restaurant.genre}
                </Text>

                <View className="flex-row items-center mt-2" style={{ gap: 16 }}>
                    {restaurant.rating != null ? (
                        <View className="flex-row items-center" style={{ gap: 4 }}>
                            <Star fill={COLORS.ink} color={COLORS.ink} size={14} strokeWidth={2} />
                            <Text className="text-caption font-labelbold text-ink">{restaurant.rating}</Text>
                        </View>
                    ) : null}
                    <View className="flex-row items-center" style={{ gap: 4 }}>
                        {estimate ? <Clock color={COLORS.inkFaint} size={14} strokeWidth={2} /> : <Bike color={COLORS.inkFaint} size={14} strokeWidth={2} />}
                        <Text className="text-caption text-ink-muted font-body">{estimate ?? `Livraison ${formatXaf(DELIVERY_FEE_XAF)}`}</Text>
                    </View>
                </View>
            </View>
            {trailing}
        </Pressable>
    );
}
