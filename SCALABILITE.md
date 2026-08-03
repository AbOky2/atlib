# Audit résilience & scalabilité — NOIR Delivery

Objectif : tenir **3 000 à 10 000 utilisateurs simultanés** au pic (midi), avec une
app résiliente sur réseau instable (Tchad) et prête pour la prod.

**Verdict global :** l'app n'est **pas encore prête pour 10k** telle quelle — mais le
blocage est à **~80 % côté backend/infra Supabase** (index, contrainte d'unicité,
RPC atomique, RLS, capacité Realtime, plan). Le **client a été durci** (voir §1).

---

## 0. ✅ Mise à jour — refonte du 8 juillet 2026

La refonte design « Uber Eats » s'est accompagnée d'une passe de robustesse qui
résorbe l'essentiel des dettes des §2 et §5 :

| Correctif | Où |
|---|---|
| **Tout le SQL du §2 est livré** (index unique atomique, RPC `create_order` idempotente avec totaux recalculés serveur, index FK, helper RLS STABLE, `statement_timeout`, trigger `updated_at`) | `supabase_production.sql` — **à exécuter dans Supabase** |
| **Client idempotent** : clé `client_request_id` générée 1×/tentative de checkout ; appel RPC d'abord, repli automatique sur l'ancien chemin tant que la RPC n'est pas déployée ; compensation si l'insert des articles échoue (plus de commande orpheline) | `src/hooks/useSupabase.ts`, `payment-method.tsx`, `src/lib/ids.ts` |
| **Source unique des 7 statuts** (labels, couleurs, progression, machine à états) — fin des duplications divergentes | `src/lib/orderStatus.ts`, consommé par tracking / orders / dashboard / notifications / liveActivity / bannière |
| **Machine à états appliquée** : `updateOrderStatus(id, to, from?)` valide la transition ET fait un UPDATE conditionnel (`status = from`) → une UI périmée ne peut plus pousser un statut en arrière (`STATUS_CONFLICT`) ; les boutons du dashboard sont dérivés de `LEGAL_TRANSITIONS` | `src/hooks/useSupabase.ts`, `dashboard.tsx`, `tracking.tsx` |
| **Réconciliation des écritures** (Kleppmann) : tout merge du cache commandes passe par `reconcileOrderRow`, gardé par `updated_at` — un poll en vol n'écrase plus un statut plus récent | `src/lib/reconcile.ts`, `GlobalOrderSync.tsx` |
| **Offline visible** : bannière hors-ligne branchée sur NetInfo (en plus de la pause React Query déjà en place) | `src/components/OfflineBanner.tsx` |
| **DRY** : `formatXaf` partout (fini les 10 copies de `formatPrice`) ; code mort supprimé (`TabBar.tsx`, `GradientOverlay.tsx`, état `latestOrder`, `fetch_screens.js` qui embarquait une **clé API en dur** — à révoquer, elle reste dans l'historique git) | — |
| **Tests** : 35 tests `node:test` sur la logique pure (machine à états, pricing, ETA, quartiers, idempotence, réconciliation, identité des lignes panier) — `npm test` ; typecheck `npm run typecheck` ; ils ont déjà attrapé un vrai bug (`getEstimatedDeliveryTime('')` → 15 min au lieu de 30) | `tests/`, `tsconfig.test.json` |

Restent ouverts : §3 (scoper le Realtime + plan/load-test) et §4 (Sentry, pooler,
persistance MMKV du cache).

---

## 1. ✅ Déjà corrigé côté client (dans ce commit)

| Correctif | Fichier | Effet à l'échelle |
|---|---|---|
| **ErrorBoundary** monté à la racine | `src/components/ErrorBoundary.tsx`, `app/_layout.tsx` | Une erreur de rendu n'écran-blanc plus toute l'app (récupérable) |
| **Awareness offline** (NetInfo → `onlineManager`) + **focus** (AppState → `focusManager`) | `src/lib/reactQueryNetwork.ts` | Les requêtes se mettent en pause hors-ligne (fini le matraquage), refetch coalescé au retour réseau |
| **Retry conditionnel** (jamais les 4xx / RLS / PGRST) + backoff plafonné + jitter | `src/lib/queryClient.ts` | Coupe l'amplification retry 3× → au plus 2× ; plus de retries inutiles sur auth/permission |
| **Mutations `retry: false`** | `src/lib/queryClient.ts` | Une création/màj commande n'est jamais rejouée (anti-doublon) |
| **Realtime : jitter reconnexion + heartbeat 20s + `eventsPerSecond`** | `src/lib/supabase.ts` | Une coupure réseau ne provoque plus un thundering-herd de reconnexions ; sockets morts détectés vite |
| **GlobalOrderSync durci** : canal créé 1×/commande (fini le churn à chaque changement de statut), `try/catch`, handler d'erreur `subscribe`, null-guard, plus de `setTimeout` non nettoyé | `src/components/GlobalOrderSync.tsx` | Divise par ~5-6 le nombre de `join` Realtime par commande (le join-rate est justement la métrique limitée) |
| **Polling allégé & jitteré** : client 30s (au lieu de 15s) et **seulement si commande active** ; dashboard 20s **seulement si commandes actives** (au lieu de 15s inconditionnel) | `src/hooks/useSupabase.ts` | ~2× moins de charge REST au steady-state ; les dashboards inactifs ne scannent plus la table |
| **Cache long pour le quasi-statique** (restos/plats : staleTime 30min, gcTime 24h) | `src/hooks/useSupabase.ts` | Quasi zéro requête resto/plat au pic ; navigation servie depuis le cache |
| **Frais centralisés** (`pricing.ts`) au lieu de dupliqués | `src/lib/pricing.ts`, cart, payment | Fin de la divergence des frais entre écrans |

---

## 2. 🔴 CRITIQUE — à faire côté Postgres (SQL à exécuter dans Supabase)

### 2.1 Race condition « une seule commande active » (peut créer des doublons au pic)
Aujourd'hui `createOrder` fait un *check-then-insert* (SELECT puis INSERT) sans
contrainte DB → deux taps/deux appareils/un retry passent le SELECT et créent
**deux commandes**. À enforcer par la base :

```sql
-- Une seule commande non terminée par client, garanti atomiquement :
CREATE UNIQUE INDEX CONCURRENTLY one_active_order_per_customer
  ON orders (customer_id)
  WHERE status NOT IN ('DELIVERED','CANCELLED');
```
Puis **supprimer** `getActiveOrder()` et laisser l'INSERT échouer : supabase-js
renvoie `error.code === '23505'` → on le mappe à `ACTIVE_ORDER_EXISTS`.

### 2.2 Création de commande atomique + idempotente (fini les commandes orphelines)
`createOrder` fait **2 INSERT séparés** (orders puis order_items) sans transaction :
si le 2ᵉ échoue, on a une commande **sans articles** qui bloque les suivantes.
→ Déplacer dans **une RPC transactionnelle** :

```sql
CREATE OR REPLACE FUNCTION public.create_order(payload jsonb)
RETURNS orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_order orders;
BEGIN
  INSERT INTO orders (customer_id, restaurant_id, restaurant_name, delivery_address,
    delivery_zone, delivery_note, subtotal_xaf, delivery_fee_xaf, total_xaf,
    payment_method, status, client_request_id)
  VALUES (...payload..., 'PENDING', (payload->>'client_request_id')::uuid)
  RETURNING * INTO new_order;

  INSERT INTO order_items (order_id, dish_id, name, qty, price_xaf)
  SELECT new_order.id, (i->>'dish_id')::uuid, i->>'name', (i->>'qty')::int, (i->>'price_xaf')::int
  FROM jsonb_array_elements(payload->'items') i;

  RETURN new_order;
END $$;
```
+ **clé d'idempotence** : générer un `uuid` **une fois par tentative de checkout**
(stocké dans le cartStore), colonne `orders.client_request_id UNIQUE` → un retry
après réponse perdue renvoie la MÊME commande au lieu d'en créer une 2ᵉ.
⚠️ **Le total doit être recalculé DANS la RPC** (pas fait confiance au client — un
client modifié peut envoyer `total_xaf = 0`).

### 2.3 Index manquants (toutes les requêtes chaudes font des *sequential scans*)
Postgres **n'indexe pas** automatiquement les colonnes FK.
```sql
CREATE INDEX CONCURRENTLY orders_customer_created_idx    ON orders (customer_id, created_at DESC);
CREATE INDEX CONCURRENTLY orders_restaurant_created_idx  ON orders (restaurant_id, created_at DESC);
CREATE INDEX CONCURRENTLY order_items_order_id_idx       ON order_items (order_id);
CREATE INDEX CONCURRENTLY order_items_dish_id_idx        ON order_items (dish_id);
CREATE INDEX CONCURRENTLY dishes_restaurant_avail_idx    ON dishes (restaurant_id) WHERE is_available = true;
CREATE INDEX CONCURRENTLY dishes_category_id_idx         ON dishes (category_id);
CREATE INDEX CONCURRENTLY categories_restaurant_idx      ON categories (restaurant_id);
CREATE INDEX CONCURRENTLY restaurants_active_rating_idx  ON restaurants (rating DESC) WHERE is_active = true;
```

### 2.4 RLS performante (sinon les fonctions sont ré-évaluées par ligne)
```sql
-- Helpers STABLE + SECURITY DEFINER (le planner peut cacher le résultat) :
CREATE OR REPLACE FUNCTION public.my_restaurant_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT restaurant_id FROM profiles WHERE id = (select auth.uid()) $$;
-- Idem is_admin(), my_role().

-- Envelopper les appels auth dans un sous-SELECT scalaire → évalué UNE fois par requête :
CREATE POLICY orders_select_own ON orders FOR SELECT
  USING ( customer_id = (select auth.uid())
          OR restaurant_id = (select public.my_restaurant_id())
          OR (select public.is_admin()) );
```

---

## 3. 🟠 Realtime à l'échelle (le plus gros risque d'infra)

Le design actuel (`postgres_changes` filtré par order id) ouvre **~3k-5k websockets**
au pic — **6 à 10× le quota par défaut du plan Pro (500)**. `postgres_changes` est
le transport **le moins scalable** de Supabase (RLS ré-évaluée par abonné sur chaque
changement WAL). Trois leviers :

1. **Passer à Broadcast-from-database** (au lieu de `postgres_changes`) : un trigger
   `AFTER UPDATE` appelle `realtime.broadcast_changes` vers un topic `user:<id>` ;
   le client s'abonne en Broadcast. Route par topic **sans RLS par abonné sur le WAL**
   → tient beaucoup plus d'abonnés/compute.
2. **Scoper l'abonnement à l'écran de suivi** (au lieu de global) : ne garder le socket
   ouvert que sur `tracking.tsx` ; ailleurs, le poll 30s + une **push notification**
   serveur suffisent. → **-5 à -10× de connexions**.
3. **Dimensionner l'infra** : plan **Team/Enterprise** avec capacité Realtime pour ~10k,
   **compute dédié Large+** (un Micro/Small ne tient pas des milliers de sockets).
   **Load-test obligatoire** avant le lancement.

> Le fallback poll est déjà en place, donc réduire/scoper le Realtime est **peu risqué** côté correctness.

---

## 4. 🟡 Infra & observabilité

- **Pooler** : router le trafic PostgREST via **Supavisor en mode transaction** (port 6543).
- **Garde-fou** : `ALTER ROLE authenticated SET statement_timeout = '5s';` (idem `anon`).
- **Crash reporting** : ajouter **Sentry** (`@sentry/react-native`), brancher dans
  `ErrorBoundary.componentDidCatch` + les `catch` de création/màj commande + un handler
  global d'unhandled-rejection. Sans ça, les crashes/erreurs en prod sont **invisibles**.
- **Persistance du cache** (optionnel, forte valeur au Tchad) :
  `@tanstack/react-query-persist-client` + persister MMKV (déjà dispo dans `storage.ts`)
  → menus servis depuis le disque au démarrage à froid, sans réseau.

---

## 5. 🟢 Best practices (Fowler / Uncle Bob / Kleppmann) — dette à résorber

- **Source unique des 7 statuts** : les libellés/couleurs/ordre sont dupliqués (et
  **déjà divergents** : « Livré » vs « Livrée ») dans `liveActivity.ts`, `orders.tsx`,
  `dashboard.tsx`, `tracking.tsx`. → créer `src/lib/orderStatus.ts` (enum + `STATUS_META`)
  que tous importent. *(Recommandé — non fait ici pour éviter une régression juste après la grosse refonte.)*
- **Machine à états** : `updateOrderStatus(status: string)` accepte n'importe quoi →
  typer `OrderStatus` + une map de transitions légales (dériver les boutons du dashboard).
- **Réconciliation des écritures** (Kleppmann) : poll + realtime + optimistic écrivent
  le même cache **sans clé de version** → un poll en vol peut réécrire un statut en
  arrière. Ajouter `orders.updated_at` et **ne remplacer que si `updated_at` ≥ caché**.
- **DRY** : `formatPrice` réimplémenté dans ~10 fichiers → utiliser `formatXaf` de
  `src/lib/pricing.ts` partout.
- **Optimistic avec rollback** : passer les mutations en `useMutation`
  (`onMutate` snapshot → `onError` restore → `onSettled` invalidate).

---

## Ordre de priorité recommandé
1. **2.1 + 2.2** (contrainte unique + RPC atomique + idempotence) — *correctness des commandes.*
2. **2.3 + 2.4** (index + RLS) — *sans ça, la DB s'écroule au pic.*
3. **3** (Realtime : scoper + plan + load-test).
4. **4** (Sentry + pooler + statement_timeout).
5. **5** (dette architecture, en continu).
