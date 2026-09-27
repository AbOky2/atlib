import { ScrollView, View, Text, Pressable, useWindowDimensions } from 'react-native';

import { ALL_CATEGORY_ID, type FoodCategory } from '../lib/categories';
import { CategoryIcon } from './CategoryIcon';
import { COLORS } from '../lib/palette';
import { SCREEN_GUTTER } from './ui';

/** Minimum width of one cuisine: the glyph, its word, nothing to spare. */
const MIN_ITEM_WIDTH = 64;
const GLYPH = 40;

/**
 * The cuisine rail — Uber Eats' shape, NOIR's typography, Fluent's drawings.
 *
 * With a handful of cuisines the row spreads across the page width, aligned on
 * the gutter, so a wide phone never shows five items huddled on the left. Only
 * when they no longer fit does the rail become a horizontal scroll. Selection
 * is carried by weight and a short accent bar, never by a background.
 */
export function CategoryRail({
    items,
    activeId,
    onSelect,
}: {
    items: readonly FoodCategory[];
    activeId: string;
    onSelect: (id: string) => void;
}) {
    const { width } = useWindowDimensions();
    const available = width - SCREEN_GUTTER * 2;
    const fits = items.length * MIN_ITEM_WIDTH <= available;
    const itemWidth = fits ? available / items.length : MIN_ITEM_WIDTH;

    const cells = items.map(({ id, label }) => {
        const active = activeId === id;
        return (
            <Pressable
                key={id}
                onPress={() => onSelect(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label}
                className="items-center active:opacity-60"
                style={{ width: itemWidth, paddingVertical: 4 }}
            >
                {/* Unselected cuisines step back without going grey. */}
                <View style={{ opacity: active ? 1 : 0.82, height: GLYPH + 4, justifyContent: 'center' }}>
                    <CategoryIcon id={id} size={GLYPH} />
                </View>
                <Text
                    numberOfLines={1}
                    className={`text-caption mt-1 ${active ? 'font-labelbold text-ink' : 'font-label text-ink-muted'}`}
                >
                    {label}
                </Text>
                <View
                    style={{
                        height: 2,
                        width: 20,
                        borderRadius: 1,
                        marginTop: 6,
                        backgroundColor: active ? COLORS.accent : 'transparent',
                    }}
                />
            </Pressable>
        );
    });

    if (fits) {
        return <View className="flex-row" style={{ paddingHorizontal: SCREEN_GUTTER }}>{cells}</View>;
    }
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER - (MIN_ITEM_WIDTH - GLYPH) / 2 }}
        >
            {cells}
        </ScrollView>
    );
}

export { ALL_CATEGORY_ID };
