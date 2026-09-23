import { isOrderStatus, isTerminal, type OrderStatus } from './orderStatus';
export interface OrderPush {
    kind: 'order-status'; orderId: string; customerId: string;
    status: OrderStatus; updatedAt: string; statusTitle: string; statusBody: string;
}
export function parseOrderPush(value: unknown): OrderPush | null {
    if (!value || typeof value !== 'object') return null;
    const p = value as Record<string, unknown>;
    if (p.kind !== 'order-status' || !isOrderStatus(p.status)) return null;
    for (const key of ['orderId','customerId','updatedAt','statusTitle','statusBody']) {
        if (typeof p[key] !== 'string' || !(p[key] as string).length || (p[key] as string).length > 1000) return null;
    }
    if (!Number.isFinite(Date.parse(p.updatedAt as string))) return null;
    return p as unknown as OrderPush;
}
export function shouldApplyOrderPush(incoming: OrderPush, owner: string | null, previous?: { updatedAt: string; status: string; orderId?: string }): boolean {
    if (owner !== incoming.customerId) return false;
    if (!previous || !Number.isFinite(Date.parse(previous.updatedAt))) return true;
    if (previous.orderId && previous.orderId !== incoming.orderId) return Date.parse(incoming.updatedAt) > Date.parse(previous.updatedAt);
    if (isTerminal(previous.status)) return false;
    return Date.parse(incoming.updatedAt) > Date.parse(previous.updatedAt);
}
