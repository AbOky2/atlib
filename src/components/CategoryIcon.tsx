import Svg, { Circle, Path, Rect, G } from 'react-native-svg';

import { ALL_CATEGORY_ID } from '../lib/categories';
import { COLORS } from '../lib/palette';

/**
 * The cuisine glyphs — drawn, not generated.
 *
 * One construction rule for the whole family: a 48-point grid, a single 2.4 pt
 * ink stroke with round caps and joins, and a few flat pigments taken from the
 * food itself — bun gold, tomato, basil, grilled meat, cream — so the rail has
 * some appetite without borrowing the brand orange, which stays reserved for
 * the selection and the primary action. Nothing thinner than the stroke, so
 * the set stays crisp at the 32 pt of the rail.
 */
const STROKE = 2.4;
const line = { fill: 'none', stroke: COLORS.ink, strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Pigments of the drawings only — this file is the one place they live. */
const PIGMENT = {
    cream: '#FFF1E6',
    bun: '#F3C577',
    cheese: '#F7D96A',
    tomato: '#E2573C',
    basil: '#5E9C5F',
    meat: '#B9603F',
    pepper: '#7FAF5A',
    stew: '#E28A45',
    steam: COLORS.inkDisabled,
} as const;

const filled = (fill: string) => ({ ...line, fill }) as const;

/** Tout — a cloche over a plate: the whole table. */
function AllIcon() {
    return (
        <G>
            <Path d="M8 31 a16 14 0 0 1 32 0 z" {...filled(PIGMENT.cream)} />
            <Path d="M24 17 v-3.5" {...line} />
            <Circle cx={24} cy={12} r={2} fill={COLORS.accent} />
            <Path d="M5 31 h38" {...line} />
            <Path d="M10 36.5 h28" {...line} />
        </G>
    );
}

/** Local — the family pot, lid ajar, still steaming. */
function LocalIcon() {
    return (
        <G>
            <Path d="M9 21.5 h30 v5 a15 15.5 0 0 1 -30 0 z" {...filled(PIGMENT.stew)} />
            <Path d="M5.5 21.5 h37" {...line} />
            <Path d="M13.5 21.5 a10.5 5.5 0 0 1 21 0" {...filled(PIGMENT.cream)} />
            <Path d="M24 16 v-2" {...line} />
            <Path d="M17.5 9 q1.8 -2.2 0 -4.6" {...line} stroke={PIGMENT.steam} />
            <Path d="M24 10 q1.8 -2.2 0 -4.6" {...line} stroke={PIGMENT.steam} />
            <Path d="M30.5 9 q1.8 -2.2 0 -4.6" {...line} stroke={PIGMENT.steam} />
        </G>
    );
}

/** Grillades — a skewer: meat, pepper, meat, ring at the handle. */
function GrilladesIcon() {
    return (
        <G>
            <Path d="M11.5 36.5 L38 10" {...line} />
            <Path d="M38 10 l-4.2 1.1 l3.1 3.1 z" fill={COLORS.ink} stroke={COLORS.ink} strokeWidth={STROKE} strokeLinejoin="round" />
            <Circle cx={9.5} cy={38.5} r={3.2} {...line} />
            <Rect x={12.5} y={26} width={8.4} height={8.4} rx={2.4} transform="rotate(-45 16.7 30.2)" {...filled(PIGMENT.meat)} />
            <Rect x={19.5} y={19} width={8.4} height={8.4} rx={2.4} transform="rotate(-45 23.7 23.2)" {...filled(PIGMENT.pepper)} />
            <Rect x={26.5} y={12} width={8.4} height={8.4} rx={2.4} transform="rotate(-45 30.7 16.2)" {...filled(PIGMENT.meat)} />
        </G>
    );
}

/** Pizza — one slice: cheese, a golden crust, three pieces of tomato. */
function PizzaIcon() {
    return (
        <G>
            <Path d="M24 8 L40.5 37 Q24 44 7.5 37 Z" {...filled(PIGMENT.cheese)} />
            <Path d="M7.5 37 Q24 44 40.5 37 L38.6 33.7 Q24 39.6 9.4 33.7 Z" fill={PIGMENT.bun} stroke="none" />
            <Path d="M9.4 33.7 Q24 39.6 38.6 33.7" {...line} />
            <Circle cx={24} cy={20} r={2.6} fill={PIGMENT.tomato} />
            <Circle cx={19} cy={28.5} r={2.6} fill={PIGMENT.tomato} />
            <Circle cx={29.5} cy={30} r={2.6} fill={PIGMENT.tomato} />
        </G>
    );
}

/** Burgers — sesame bun, a wave of lettuce, the patty, the base. */
function BurgerIcon() {
    return (
        <G>
            <Path d="M8 22 a16 12 0 0 1 32 0 z" {...filled(PIGMENT.bun)} />
            <Circle cx={18} cy={15} r={1.2} fill={COLORS.ink} />
            <Circle cx={24} cy={13} r={1.2} fill={COLORS.ink} />
            <Circle cx={30} cy={15} r={1.2} fill={COLORS.ink} />
            <Path d="M7 26.5 q3 -2.6 6 0 t6 0 t6 0 t6 0 t6 0 t3 0" {...line} stroke={PIGMENT.basil} />
            <Rect x={9} y={30} width={30} height={4.5} rx={2} fill={PIGMENT.meat} />
            <Path d="M9 36 h30 v1 a4.5 4.5 0 0 1 -4.5 4.5 h-21 a4.5 4.5 0 0 1 -4.5 -4.5 z" {...filled(PIGMENT.bun)} />
        </G>
    );
}

const DRAWINGS: Record<string, () => React.JSX.Element> = {
    [ALL_CATEGORY_ID]: AllIcon,
    local: LocalIcon,
    grillades: GrilladesIcon,
    pizza: PizzaIcon,
    burger: BurgerIcon,
};

export function CategoryIcon({ id, size = 32 }: { id: string; size?: number }) {
    const Drawing = DRAWINGS[id] ?? AllIcon;
    return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
            <Drawing />
        </Svg>
    );
}
