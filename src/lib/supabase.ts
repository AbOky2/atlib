import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://myonaycuggsbielvdzjc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15b25heWN1Z2dzYmllbHZkempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODcxOTUsImV4cCI6MjA4ODU2MzE5NX0.RYSXIvHNtmYotjrjuSO3PcU1tRzSRFtZCdnO95FQzGk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    realtime: {
        // Throttle client-side event processing.
        params: { eventsPerSecond: 5 },
        // Detect dead sockets faster than the 30s default so phantom connections
        // are freed back into the concurrency quota sooner (important at peak).
        heartbeatIntervalMs: 20000,
        timeout: 20000,
        // Jittered reconnect so a mass disconnect (tower handoff / brief outage on
        // congested networks) doesn't stampede back all at once and blow the
        // realtime join-rate limit. Spreads thousands of reconnects over >10s.
        reconnectAfterMs: (tries: number) => {
            const base = [1000, 2000, 5000, 10000, 15000][tries - 1] ?? 15000;
            return base + Math.floor(Math.random() * 8000);
        },
    },
});
