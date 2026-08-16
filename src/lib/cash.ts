/**
 * Paying in cash, modelled properly.
 *
 * In N'Djamena almost every order is settled in notes at the door, and the most
 * common way for a delivery to sour is not the food — it's change. The customer
 * hands over a 10 000 F note for a 7 500 F order, the driver has nothing to give
 * back, and someone ends up unhappy over 2 500 F.
 *
 * A card-first delivery app never has to think about this. This one does: the
 * customer declares what they will pay with, and the restaurant sees exactly how
 * much change to put in the bag BEFORE leaving. It costs one question at
 * checkout and removes a daily friction.
 *
 * Largest CFA (BEAC) note in circulation is 10 000 F, so suggestions are built
 * from round amounts a customer plausibly holds.
 */

/** Round amounts are suggested on this grid — the usual way people hold notes. */
const STEP_XAF = 5000;

/**
 * Amounts to offer the customer: the exact total is handled separately, these
 * are the realistic notes they might hand over, in ascending order.
 */
export function suggestedCashAmounts(total: number, count = 3): number[] {
    if (!Number.isFinite(total) || total <= 0) return [];
    const amounts: number[] = [];
    // First round amount strictly above the total (equal to it IS the exact case).
    let candidate = Math.ceil((total + 1) / STEP_XAF) * STEP_XAF;
    while (amounts.length < count) {
        amounts.push(candidate);
        candidate += STEP_XAF;
    }
    return amounts;
}

/**
 * Change the restaurant must bring back. Returns 0 when the customer pays the
 * exact amount, and null when the declared amount can't cover the order (the UI
 * treats that as "not declared" rather than showing negative change).
 */
export function changeToGive(total: number, paidWith: number | null | undefined): number | null {
    if (paidWith == null || !Number.isFinite(paidWith)) return null;
    if (paidWith < total) return null;
    return paidWith - total;
}
