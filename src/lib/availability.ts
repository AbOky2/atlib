/**
 * Whether a restaurant is currently taking orders.
 *
 * Deliberately a single manual switch rather than an opening-hours schedule:
 * in N'Djamena a kitchen closes because it ran out of charcoal, because the
 * power went, or because it is simply slammed — none of which a cron-shaped
 * timetable predicts. The people in the kitchen know; the app should ask them,
 * not a calendar.
 *
 * `is_accepting_orders` is optional on purpose: on a database where the column
 * hasn't been added yet the value is `undefined` and every restaurant reads as
 * open, exactly as before. Only an explicit `false` closes a restaurant.
 */
export interface HasAvailability {
    is_accepting_orders?: boolean | null;
}

export const isAcceptingOrders = (restaurant: HasAvailability | null | undefined): boolean =>
    restaurant?.is_accepting_orders !== false;

/** Copy shown wherever a closed restaurant is surfaced. */
export const CLOSED_LABEL = 'Fermé';
export const CLOSED_NOTICE = "Ce restaurant n'accepte pas de commandes pour le moment.";
