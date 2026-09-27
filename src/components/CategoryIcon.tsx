import { SvgXml } from 'react-native-svg';

import { ALL_CATEGORY_ID } from '../lib/categories';
import { CUISINE_EMOJI } from '../assets/cuisineEmoji';

/**
 * The cuisine glyph of the rail: a Fluent Emoji (MIT), rendered from its SVG.
 * One drawing per category id; an unknown id falls back to the table setting.
 */
export function CategoryIcon({ id, size = 40 }: { id: string; size?: number }) {
    const xml = CUISINE_EMOJI[id] ?? CUISINE_EMOJI[ALL_CATEGORY_ID];
    return <SvgXml xml={xml} width={size} height={size} />;
}
