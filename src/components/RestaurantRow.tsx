import { View, Text, Pressable } from 'react-native';
import { Star, Clock, Truck } from 'lucide-react-native';

import { RemoteImage } from './RemoteImage';
import { ClosedBadge } from './ClosedBadge';
import { isAcceptingOrders } from '../lib/availability';
import { restaurantEtaRange, formatEtaRange } from '../lib/eta';
import { DELIVERY_FEE_XAF, formatXaf } from '../lib/pricing';
import { COLORS } from '../lib/palette';

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
 * One restaurant, in list form.
 *
 * Home used to render every restaurant as a full-bleed editorial card roughly
 * 480 px tall. That is a beautiful way to show three, and an unusable way to
 * show fifty: the customer scrolls past two screens of photography per entry and
 * the whole catalogue is materialised at once. This row is the browsing unit —
 * fixed height, so the list can be virtualised and told exactly how tall it is.
 */
export function RestaurantRow({
    restaurant,
    onPress,
    onPressIn,
}: {
    restaurant: RowRestaurant;
    onPress: () => void;
    onPressIn?: () => void;
}) {
    const open = isAcceptingOrders(restaurant);

    return (
        <Pressable
            onPress={onPress}
            onPressIn={onPressIn}
            accessibilityRole="button"
            accessibilityLabel={`${restaurant.name}${open ? '' : ', fermé'}`}
            className="flex-row items-center gap-4 px-6 active:opacity-70"
            style={{ height: RESTAURANT_ROW_HEIGHT }}
        >
            <View
                className="w-[84px] h-[84px] rounded-card overflow-hidden bg-fill-strong"
                style={{ opacity: open ? 1 : 0.45 }}
            >
                <RemoteImage uri={restaurant.image_url} displayWidth={84} className="w-full h-full" />
            </View>

            <View className="flex-1 justify-center">
                <View className="flex-row items-center gap-2">
                    <Text numberOfLines={1} className="text-bodylg font-heading tracking-tight text-ink flex-shrink">
                        {restaurant.name}
                    </Text>
                    {!open && <ClosedBadge tone="onSurface" />}
                </View>

                <Text numberOfLines={1} className="text-label text-ink-muted font-body mt-0.5">
                    {restaurant.genre}
                </Text>

                <View className="flex-row items-center gap-4 mt-2">
                    <View className="flex-row items-center gap-1.5">
                        <Star fill={COLORS.ink} color={COLORS.ink} size={12} />
                        <Text className="text-caption font-labelbold text-ink">{restaurant.rating}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <Clock color={COLORS.inkFaint} size={12} />
                        <Text className="text-caption text-ink-muted font-body">
                            {formatEtaRange(restaurantEtaRange(restaurant.id))}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <Truck color={COLORS.inkFaint} size={12} />
                        <Text className="text-caption text-ink-muted font-body">{formatXaf(DELIVERY_FEE_XAF)}</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}
