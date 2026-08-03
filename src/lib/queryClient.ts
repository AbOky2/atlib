import { QueryClient } from '@tanstack/react-query';

/**
 * Only retry transient failures. Retrying 4xx / auth / RLS / PostgREST errors
 * wastes round-trips and, at 10k clients, turns each failed poll into a 3x
 * retry-storm against an already-struggling backend.
 */
const shouldRetry = (failureCount: number, error: any): boolean => {
    const status = error?.status ?? error?.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) return false;
    // PostgREST/Supabase logical errors (PGRSTxxx, 23505, RLS) never succeed on retry.
    if (typeof error?.code === 'string' && (error.code.startsWith('PGRST') || /^\d/.test(error.code))) return false;
    return failureCount < 2;
};

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: shouldRetry,
            // Capped exponential backoff with jitter so retries don't align into spikes.
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000) + Math.floor(Math.random() * 1000),
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // keep unused data 30 min (survives navigation)
        },
        mutations: {
            // Mutations must NOT auto-retry — a retried create/update can duplicate writes.
            retry: false,
        },
    },
});
