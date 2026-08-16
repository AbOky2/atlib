import Svg, { Circle, Path, Rect, G } from 'react-native-svg';

import { ALL_CATEGORY_ID } from '../lib/categories';

/**
 * Hand-drawn cuisine icons.
 *
 * Emoji were a stopgap: they carry another vendor's drawing style, shift between
 * iOS and Android, and none of them is *ours*. These are built from primitives on
 * a 48×48 grid, in one palette, with one construction rule — a warm body, a
 * lighter plane on top where light would fall, and the brand orange used once per
 * icon at most. Read at 34 px they stay legible because nothing is thinner than
 * ~2 px at that scale.
 */

// One palette for the whole set, so six drawings read as one family.
const BUN = '#E8A54B';
const BUN_DEEP = '#D98F35';
const MEAT = '#8A4B2A';
const MEAT_LIGHT = '#A65C34';
const MEAT_DARK = '#6E3B21';
const TERRACOTTA = '#C1663F';
const TERRACOTTA_DEEP = '#9A5C3A';
const CHEESE = '#F5CE84';
const CRUST = '#D9924A';
const TOMATO = '#D6431F';
const GREEN = '#6BA368';
const CREAM = '#F3EDE7';
const CREAM_LINE = '#E2D7CC';
const METAL = '#C9C4BE';
const GOLD = '#EFC169';

/** Assortment — a plate holding a little of everything. */
function AllIcon() {
    return (
        <G>
            <Circle cx={24} cy={24} r={15} fill={CREAM} />
            <Circle cx={24} cy={24} r={10.5} fill="none" stroke={CREAM_LINE} strokeWidth={1.6} />
            <Circle cx={20} cy={21.5} r={3} fill={TOMATO} />
            <Circle cx={28.5} cy={23} r={2.6} fill={GREEN} />
            <Circle cx={23.5} cy={29} r={2.8} fill={BUN} />
        </G>
    );
}

/** Brochette — the skewer you actually eat in N'Djamena, not a generic steak. */
function GrilladesIcon() {
    return (
        <G>
            <Rect x={22.4} y={3} width={3.2} height={42} rx={1.6} fill={METAL} />
            <Rect x={11} y={8} width={26} height={11} rx={4.5} fill={MEAT} />
            <Rect x={11} y={8} width={26} height={4.5} rx={2.25} fill={MEAT_LIGHT} />
            <Rect x={11} y={21} width={26} height={11} rx={4.5} fill={MEAT_DARK} />
            <Rect x={11} y={21} width={26} height={4.5} rx={2.25} fill={MEAT} />
            <Rect x={11} y={34} width={26} height={10} rx={4.5} fill={MEAT} />
            <Rect x={11} y={34} width={26} height={4} rx={2} fill={MEAT_LIGHT} />
        </G>
    );
}

/** Marmite — lid, handles and steam: the pot everything traditional comes out of. */
function TraditionIcon() {
    return (
        <G>
            <Path d="M17 11 q3.5 -3 0 -6.5" stroke={METAL} strokeWidth={2.2} strokeLinecap="round" fill="none" />
            <Path d="M24 10 q3.5 -3.5 0 -7.5" stroke={METAL} strokeWidth={2.2} strokeLinecap="round" fill="none" />
            <Path d="M31 11 q3.5 -3 0 -6.5" stroke={METAL} strokeWidth={2.2} strokeLinecap="round" fill="none" />

            <Rect x={21.8} y={12} width={4.4} height={4.4} rx={2.2} fill={TERRACOTTA_DEEP} />
            <Rect x={8.5} y={16} width={31} height={4.4} rx={2.2} fill={TERRACOTTA_DEEP} />

            <Rect x={5.5} y={23} width={5.5} height={3.6} rx={1.8} fill={TERRACOTTA_DEEP} />
            <Rect x={37} y={23} width={5.5} height={3.6} rx={1.8} fill={TERRACOTTA_DEEP} />

            <Path d="M11 21.5 h26 l-2.4 15.5 a5.5 5.5 0 0 1 -5.4 4.5 h-10.4 a5.5 5.5 0 0 1 -5.4 -4.5 z" fill={TERRACOTTA} />
        </G>
    );
}

/** A slice, cut point-up, with the crust drawn as a real rolled edge. */
function PizzaIcon() {
    return (
        <G>
            <Path d="M24 6 L39.5 36 Q24 42 8.5 36 Z" fill={CHEESE} />
            <Path d="M8.5 36 Q24 42 39.5 36" stroke={CRUST} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Circle cx={24} cy={17} r={2.2} fill={TOMATO} />
            <Circle cx={19.5} cy={25.5} r={2.6} fill={TOMATO} />
            <Circle cx={28.5} cy={28} r={2.4} fill={TOMATO} />
        </G>
    );
}

/** Stacked build — dome bun, lettuce, patty, base. Sesame catches the light. */
function BurgerIcon() {
    return (
        <G>
            <Path d="M8 23 a16 12.5 0 0 1 32 0 z" fill={BUN} />
            <Circle cx={18.5} cy={16} r={1.4} fill="#FBEBD2" />
            <Circle cx={25.5} cy={13.8} r={1.4} fill="#FBEBD2" />
            <Circle cx={31.5} cy={17} r={1.4} fill="#FBEBD2" />

            <Rect x={6.5} y={23} width={35} height={4.4} rx={2.2} fill={GREEN} />
            <Rect x={8.5} y={27.6} width={31} height={6.2} rx={3.1} fill={MEAT} />
            <Path d="M8.5 34 h31 v2.5 a5 5 0 0 1 -5 5 h-21 a5 5 0 0 1 -5 -5 z" fill={BUN_DEEP} />
        </G>
    );
}

/** A bowl with a mound — rice or riz gras, garnished. */
function AfricainIcon() {
    return (
        <G>
            <Path d="M12.5 26.5 a11.5 9 0 0 1 23 0 z" fill={GOLD} />
            <Circle cx={19.5} cy={22.5} r={2} fill={GREEN} />
            <Circle cx={28.5} cy={21.8} r={2} fill={TOMATO} />
            <Circle cx={24} cy={24.8} r={1.8} fill={MEAT} />

            <Rect x={6.5} y={25.5} width={35} height={3.8} rx={1.9} fill={TERRACOTTA_DEEP} />
            <Path d="M9.5 29.3 A14.5 12 0 0 0 38.5 29.3 Z" fill={TERRACOTTA} />
        </G>
    );
}

const DRAWINGS: Record<string, () => React.JSX.Element> = {
    [ALL_CATEGORY_ID]: AllIcon,
    grillades: GrilladesIcon,
    traditionnel: TraditionIcon,
    pizza: PizzaIcon,
    burger: BurgerIcon,
    africain: AfricainIcon,
};

export function CategoryIcon({ id, size = 38 }: { id: string; size?: number }) {
    const Drawing = DRAWINGS[id] ?? AllIcon;
    return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
            <Drawing />
        </Svg>
    );
}
