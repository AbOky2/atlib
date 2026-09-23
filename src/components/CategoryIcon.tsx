import Svg, { Circle, Path, Rect, G } from 'react-native-svg';

import { ALL_CATEGORY_ID } from '../lib/categories';
import { COLORS } from '../lib/palette';

/**
 * The cuisine glyphs — drawn, not generated.
 *
 * One construction rule for the whole family: a 48-point grid, a single 2.4 pt
 * ink stroke with round caps and joins, and at most ONE soft accent plane per
 * glyph (the wash under a cloche, inside a pot, on a slice). Nothing thinner
 * than the stroke, so the set stays crisp at the 36 pt of the rail. Each
 * drawing was rendered and checked at that size before landing here.
 */
const STROKE = 2.4;
const line = { fill: 'none', stroke: COLORS.ink, strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const wash = { ...line, fill: COLORS.accentSoft } as const;

/** Tout — a cloche over a plate: the whole table. */
function AllIcon() {
    return (
        <G>
            <Path d="M8 31 a16 14 0 0 1 32 0 z" {...wash} />
            <Path d="M24 17 v-3.5" {...line} />
            <Circle cx={24} cy={12} r={1.6} fill={COLORS.ink} />
            <Path d="M5 31 h38" {...line} />
            <Path d="M10 36.5 h28" {...line} />
        </G>
    );
}

/** Tchadien — the family pot, lid ajar, still steaming. */
function TchadienIcon() {
    return (
        <G>
            <Path d="M9 21.5 h30 v5 a15 15.5 0 0 1 -30 0 z" {...wash} />
            <Path d="M5.5 21.5 h37" {...line} />
            <Path d="M13.5 21.5 a10.5 5.5 0 0 1 21 0" {...line} />
            <Path d="M24 16 v-2" {...line} />
            <Path d="M17.5 9 q1.8 -2.2 0 -4.6" {...line} />
            <Path d="M24 10 q1.8 -2.2 0 -4.6" {...line} />
            <Path d="M30.5 9 q1.8 -2.2 0 -4.6" {...line} />
        </G>
    );
}

/** Grillades — a skewer, three pieces, ring at the handle. */
function GrilladesIcon() {
    return (
        <G>
            <Path d="M11.5 36.5 L38 10" {...line} />
            <Path d="M38 10 l-4.2 1.1 l3.1 3.1 z" fill={COLORS.ink} stroke={COLORS.ink} strokeWidth={STROKE} strokeLinejoin="round" />
            <Circle cx={9.5} cy={38.5} r={3.2} {...line} />
            <Rect x={12.5} y={26} width={8.4} height={8.4} rx={2.4} transform="rotate(-45 16.7 30.2)" {...wash} />
            <Rect x={19.5} y={19} width={8.4} height={8.4} rx={2.4} transform="rotate(-45 23.7 23.2)" {...wash} />
            <Rect x={26.5} y={12} width={8.4} height={8.4} rx={2.4} transform="rotate(-45 30.7 16.2)" {...wash} />
        </G>
    );
}

/** Pizza — one slice, crust and three pieces of topping. */
function PizzaIcon() {
    return (
        <G>
            <Path d="M24 8 L40.5 37 Q24 44 7.5 37 Z" {...wash} />
            <Path d="M10 33.5 Q24 39.5 38 33.5" {...line} />
            <Circle cx={24} cy={20} r={2.4} fill={COLORS.ink} />
            <Circle cx={19} cy={28.5} r={2.4} fill={COLORS.ink} />
            <Circle cx={29.5} cy={30} r={2.4} fill={COLORS.ink} />
        </G>
    );
}

/** Burgers — sesame bun, a wave of lettuce, the base. */
function BurgerIcon() {
    return (
        <G>
            <Path d="M8 22 a16 12 0 0 1 32 0 z" {...wash} />
            <Circle cx={18} cy={15} r={1.2} fill={COLORS.ink} />
            <Circle cx={24} cy={13} r={1.2} fill={COLORS.ink} />
            <Circle cx={30} cy={15} r={1.2} fill={COLORS.ink} />
            <Path d="M7 27.5 q3 -2.6 6 0 t6 0 t6 0 t6 0 t6 0 t3 0" {...line} />
            <Path d="M9 33 h30 v2 a5 5 0 0 1 -5 5 h-20 a5 5 0 0 1 -5 -5 z" {...wash} />
        </G>
    );
}

const DRAWINGS: Record<string, () => React.JSX.Element> = {
    [ALL_CATEGORY_ID]: AllIcon,
    tchadien: TchadienIcon,
    grillades: GrilladesIcon,
    pizza: PizzaIcon,
    burger: BurgerIcon,
};

export function CategoryIcon({ id, size = 36 }: { id: string; size?: number }) {
    const Drawing = DRAWINGS[id] ?? AllIcon;
    return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
            <Drawing />
        </Svg>
    );
}
