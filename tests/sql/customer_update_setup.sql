-- La fixture autorise tout (orders_baseline) : ici on retire ce joker pour
-- éprouver la politique réelle du client. À jouer en dernier. Un client par
-- commande vivante : l'index « active » n'en tolère qu'une à la fois.
DROP POLICY IF EXISTS orders_baseline ON orders;
-- La base distante laisse chaque client lire ses commandes ; un UPDATE ... WHERE a
-- besoin de cette lecture pour trouver la ligne.
CREATE POLICY orders_customer_select ON orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
INSERT INTO restaurants(id,name,is_active,is_accepting_orders,rating) VALUES ('10000000-0000-4000-8000-000000000051','Politique client',true,true,4);
INSERT INTO orders(id,restaurant_id,customer_id,status,delivery_address,delivery_fee_xaf,subtotal_xaf,total_xaf,payment_method) VALUES
 ('80000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000051','30000000-0000-4000-8000-000000000051','PENDING','a',1500,3000,5000,'cash'),
 ('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000051','30000000-0000-4000-8000-000000000053','ACCEPTED','a',1500,3000,5000,'cash'),
 ('80000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000051','30000000-0000-4000-8000-000000000054','OUT_FOR_DELIVERY','a',1500,3000,5000,'cash'),
 ('80000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000051','30000000-0000-4000-8000-000000000052','PENDING','a',1500,3000,5000,'cash');
