-- Droits resserrés à la colonne : un compte restaurant modifie SA fiche, jamais
-- sa note ni son activation ; les visiteurs anonymes ne lisent aucune commande.
-- Requires 202609050001_order_integrity.sql.
BEGIN;
REVOKE UPDATE ON public.restaurants FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name, image_url, genre, description, address, is_accepting_orders) ON public.restaurants TO authenticated;
-- rating et is_active restent réservés au SQL Editor / service_role.
REVOKE SELECT ON public.orders, public.order_items FROM anon;
COMMIT;
