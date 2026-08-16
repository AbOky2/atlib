import { useWindowDimensions } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';

import { sizedImageUrl } from '../lib/images';

/**
 * The app's single remote-image surface.
 *
 * Wraps expo-image (disk + memory cache, no re-download on every scroll — RN's
 * Image has no cache policy control) and asks Supabase for a photo scaled to the
 * box it is drawn into. A soft fade replaces the blank-then-pop that made lists
 * feel cheap on slow connections.
 *
 * `displayWidth` is the LOGICAL width of the box; the pixel width is derived from
 * the device scale so a 3x screen still gets a crisp image.
 */
export function RemoteImage({
    uri,
    displayWidth,
    contentFit = 'cover',
    className,
    style,
    quality,
}: {
    uri: string | null | undefined;
    displayWidth: number;
    contentFit?: ImageContentFit;
    className?: string;
    style?: any;
    quality?: number;
}) {
    const { scale } = useWindowDimensions();
    const source = sizedImageUrl(uri, { width: displayWidth * Math.min(scale, 3), quality });

    return (
        <Image
            source={source}
            className={className}
            style={style}
            contentFit={contentFit}
            transition={220}
            cachePolicy="memory-disk"
            recyclingKey={source}
        />
    );
}
