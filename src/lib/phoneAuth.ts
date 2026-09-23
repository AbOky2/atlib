import { normalizeChadPhone } from './phone';

export const SMS_CODE_LENGTH = 6;
export const SMS_RESEND_DELAY_MS = 60_000;
export const isValidSmsCode = (code: string) => /^\d{6}$/.test(code.trim());

/** A delivery contact in user_metadata is user-editable and is not proof of
 * phone verification. Only the Auth provider's confirmed phone is used here. */
export function verifiedAccountPhone(user: { phone?: string; phone_confirmed_at?: string; user_metadata?: unknown } | null | undefined): string | null {
    return user?.phone_confirmed_at ? normalizeChadPhone(user.phone) : null;
}

export function smsResendSeconds(availableAt: number, now = Date.now()): number {
    return Math.max(0, Math.ceil((availableAt - now) / 1000));
}
