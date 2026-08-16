/**
 * Image URLs sized for the network they'll actually travel on.
 *
 * Every screen was loading full-resolution photos straight from Supabase Storage
 * — a 1.5 MB hero rendered into a 104 px thumbnail. On a metered 3G connection in
 * N'Djamena that is not a rendering detail, it is the customer's airtime and the
 * reason the app feels slow. Supabase can resize server-side; asking for the size
 * we actually draw typically cuts the payload by an order of magnitude.
 *
 * Anything that isn't a Supabase public object is returned untouched, so
 * third-party URLs keep working.
 */

const PUBLIC_OBJECT = '/storage/v1/object/public/';
const RENDER_IMAGE = '/storage/v1/render/image/public/';

export interface ImageSizeOptions {
    /** Target width in PIXELS (multiply logical size by the screen scale). */
    width: number;
    /** 20–100. 65–75 is visually indistinguishable at these sizes. */
    quality?: number;
}

export function sizedImageUrl(
    url: string | null | undefined,
    { width, quality = 70 }: ImageSizeOptions,
): string | undefined {
    if (!url) return undefined;
    if (!url.includes(PUBLIC_OBJECT)) return url; // not a Supabase object — leave alone
    const transformed = url.replace(PUBLIC_OBJECT, RENDER_IMAGE);
    const separator = transformed.includes('?') ? '&' : '?';
    return `${transformed}${separator}width=${Math.round(width)}&quality=${quality}&resize=cover`;
}
