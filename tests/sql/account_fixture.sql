-- Disposable local test database only. Tables the account-deletion migration touches
-- that the minimal fixture does not declare.
CREATE TABLE IF NOT EXISTS public.push_tokens(token text PRIMARY KEY, user_id uuid, platform text);
CREATE TABLE IF NOT EXISTS public.live_activity_tokens(order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE, token text NOT NULL);
