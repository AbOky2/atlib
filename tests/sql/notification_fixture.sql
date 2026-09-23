-- Disposable local test database only. Never run on hosted Supabase.
CREATE TABLE IF NOT EXISTS public.push_tokens(token text PRIMARY KEY, user_id uuid, platform text);
CREATE TABLE IF NOT EXISTS public.app_settings(key text PRIMARY KEY,value text);
