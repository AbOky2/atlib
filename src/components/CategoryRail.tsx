import { ScrollView, View, Text, Pressable } from 'react-native';

import { ALL_CATEGORY_ID, type FoodCategory } from '../lib/categories';
import { CategoryIcon } from './CategoryIcon';
import { COLORS } from '../lib/palette';
import { SCREEN_GUTTER } from './ui';

const ITEM_WIDTH = 76;

/**
 * The cuisine rail — Uber Eats' shape, NOIR's typography, our own drawings.
 *
 * No frame behind the glyph: the food is the illustration, and a rounded tile
 * around it only competes with it. Selection is carried by weight and a short
 * accent bar, never by a background.
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
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER - 8, gap: 4 }}
        >
            {items.map(({ id, label }) => {
                const active = activeId === id;
                return (
                    <Pressable
                        key={id}
                        onPress={() => onSelect(id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={label}
                        className="items-center active:opacity-60"
                        style={{ width: ITEM_WIDTH, paddingVertical: 4 }}
                    >
                        {/* Unselected cuisines step back without going grey. */}
                        <View style={{ opacity: active ? 1 : 0.72, height: 40, justifyContent: 'center' }}>
                            <CategoryIcon id={id} size={38} />
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
                                width: 24,
                                borderRadius: 1,
                                marginTop: 8,
                                backgroundColor: active ? COLORS.accent : 'transparent',
                            }}
                        />
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

export { ALL_CATEGORY_ID };
