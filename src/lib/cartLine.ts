/**
 * Cart line identity.
 *
 * A cart line = one dish + one exact customization. The same dish added with a
 * different note or different options must live on its OWN line (its price and
 * kitchen instructions differ); the same dish with the same customization must
 * merge into one line with a higher quantity.
 */
export const makeLineId = (dishId: string, note?: string, options?: string[]) =>
    [dishId, (note ?? '').trim(), (options ?? []).join('|')].join('::');
