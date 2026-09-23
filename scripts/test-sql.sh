#!/bin/zsh
# Rejoue les scénarios SQL sur un PostgreSQL 14 jetable (initdb/pg_ctl/psql requis, ex. brew install postgresql@14).
# Aucune base distante n'est touchée. Ordre : fixture minimale → migration d'intégrité → scénarios,
# puis fixtures et migrations de notifications et de suppression de compte.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${TMPDIR:-/tmp}/naakul-sql-$$"
PORT="${PGPORT_TEST:-55441}"
PGDATA="$WORK/pg"
cleanup() { pg_ctl -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
mkdir -p "$WORK"
initdb -D "$PGDATA" -U postgres -A trust --no-locale -E UTF8 >/dev/null
# TCP only: a Unix socket path inside a deep directory exceeds the 104-byte limit.
pg_ctl -D "$PGDATA" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -l "$WORK/pg.log" start >/dev/null
PSQL() { psql -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
PSQL -d postgres -c "CREATE DATABASE t" >/dev/null
cd "$ROOT"
PSQL -d t -f tests/sql/fixture.sql -f supabase/migrations/202609050001_order_integrity.sql -f tests/sql/order_integrity.sql >/dev/null
echo "OK  intégrité des commandes"
PSQL -d t -f supabase/migrations/202609230001_order_lifecycle.sql -f tests/sql/order_lifecycle.sql >/dev/null
echo "OK  cycle de vie (motif, réception, commandes fantômes)"
PSQL -d t -f supabase/migrations/202609230002_access_hardening.sql -f tests/sql/access_hardening.sql >/dev/null
echo "OK  droits resserrés (colonnes restaurant, anonymes)"
PSQL -d t -f tests/sql/notification_fixture.sql -f supabase/migrations/202609060001_notification_outbox.sql -f tests/sql/notification_outbox.sql >/dev/null
echo "OK  file de notifications"
PSQL -d t -f supabase/migrations/202609140001_notification_resilience.sql -f tests/sql/notification_resilience.sql >/dev/null
echo "OK  résilience des notifications"
PSQL -d t -f tests/sql/account_fixture.sql -f supabase/migrations/202609220001_account_deletion.sql -f tests/sql/account_deletion.sql >/dev/null
echo "OK  suppression de compte"
PSQL -d t -f tests/sql/local_fixture.sql -f supabase/migrations/202609230003_local_not_africain.sql -f tests/sql/local_not_africain.sql -f supabase/migrations/202609230003_local_not_africain.sql -f tests/sql/local_not_africain.sql >/dev/null
echo "OK  donnée : « Africain » devient « local » (idempotent)"
PSQL -d t -f tests/sql/customer_update_setup.sql -f supabase/migrations/202609230004_customer_order_updates.sql -f tests/sql/customer_order_updates.sql >/dev/null
echo "OK  politique client : annuler en attente, confirmer la réception, rien d'autre"
echo "Tous les scénarios SQL passent."
