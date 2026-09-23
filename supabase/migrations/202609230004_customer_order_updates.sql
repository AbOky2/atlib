-- Le client doit pouvoir annuler sa commande tant qu'elle est en attente et
-- confirmer sa réception en fin de livraison. Sur la base distante, aucune
-- politique permissive d'UPDATE ne couvrait le client : PostgREST ne modifiait
-- aucune ligne, sans erreur, et l'app concluait à un « conflit ». Le déclencheur
-- guard_order_transition (transitions légales, motif CUSTOMER) et les droits par
-- colonne (status, cancellation_reason) bornent ce que cette politique ouvre.
BEGIN;
DROP POLICY IF EXISTS orders_customer_update ON public.orders;
CREATE POLICY orders_customer_update ON public.orders FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() AND status IN ('PENDING', 'OUT_FOR_DELIVERY'))
  WITH CHECK (customer_id = auth.uid() AND status IN ('CANCELLED', 'DELIVERED'));
COMMIT;
