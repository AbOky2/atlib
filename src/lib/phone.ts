/**
 * Chadian phone numbers, normalised to E.164.
 *
 * Normalization validates a number format, not ownership or civil identity.
 *
 * Tchad: country code 235, mobile numbers are 8 digits beginning with 6, 7 or 9
 * (Airtel and Moov ranges). Users type them every possible way — "66 12 34 56",
 * "+235 66123456", "0023566123456" — so we accept all of it and store one form.
 */

export const CHAD_DIAL_CODE = '235';
const NATIONAL_LENGTH = 8;
const VALID_PREFIXES = ['6', '7', '9'];

/**
 * Returns the number in E.164 ("+23566123456"), or null when it can't be a
 * Chadian mobile number.
 */
export function normalizeChadPhone(input: string | null | undefined): string | null {
    if (!input) return null;
    let digits = input.replace(/\D/g, '');

    // Strip the international prefix in any of its written forms.
    if (digits.startsWith('00' + CHAD_DIAL_CODE)) digits = digits.slice(2 + CHAD_DIAL_CODE.length);
    else if (digits.startsWith(CHAD_DIAL_CODE) && digits.length > NATIONAL_LENGTH) {
        digits = digits.slice(CHAD_DIAL_CODE.length);
    }
    // Some people write a leading 0 out of habit with foreign formats.
    if (digits.length === NATIONAL_LENGTH + 1 && digits.startsWith('0')) digits = digits.slice(1);

    if (digits.length !== NATIONAL_LENGTH) return null;
    if (!VALID_PREFIXES.includes(digits[0])) return null;

    return `+${CHAD_DIAL_CODE}${digits}`;
}

export const isValidChadPhone = (input: string | null | undefined): boolean =>
    normalizeChadPhone(input) !== null;

/** Readable form for display: "+235 66 12 34 56". */
export function formatChadPhone(e164: string | null | undefined): string {
    const normalized = normalizeChadPhone(e164);
    if (!normalized) return e164 ?? '';
    const national = normalized.slice(1 + CHAD_DIAL_CODE.length);
    const pairs = national.match(/.{1,2}/g) ?? [];
    return `+${CHAD_DIAL_CODE} ${pairs.join(' ')}`;
}
