# Application de Livraison - Adaptée pour le Tchad

## 🇹🇩 Modifications spécifiques au contexte tchadien

Cette application a été adaptée pour répondre aux défis spécifiques du marché tchadien, notamment :
- Absence d'adressage de rue standardisé
- Connectivité Internet limitée
- Gestion des livraisons par les restaurants eux-mêmes

## 🚀 Nouvelles fonctionnalités ajoutées

### 1. Système d'adressage par points de repère
- **Sélection de zones** : N'Djamena Centre, Chagoua, Moursal, etc.
- **Points de repère** : Mosquée, marché, école, hôpital, etc.
- **Description détaillée** : Instructions précises pour localiser l'adresse
- **Numéro de téléphone obligatoire** : Contact direct avec le client

### 2. Gestion des commandes adaptée
- **Statuts de commande** : Système complet de suivi
- **Temps de livraison estimé** : Basé sur la zone de livraison
- **Contact téléphonique** : Communication directe restaurant-client
- **Confirmation de livraison** : Processus simplifié

### 3. Options de paiement locales
- **Espèces à la livraison** : Méthode principale recommandée
- **Airtel Money** : Paiement mobile Airtel
- **Tigo Cash** : Paiement mobile Tigo
- **Cartes bancaires** : Prévu pour plus tard

### 4. Interface utilisateur adaptée
- **Écrans d'adresse** : Saisie intuitive par zones et repères
- **Suivi de commande** : Informations détaillées sans géolocalisation
- **Notifications** : Système d'alerte pour les étapes importantes
- **Optimisé pour connectivité faible** : Interface légère et efficace

## 📱 Nouveaux écrans créés

### AddressScreen.js
- Sélection de zone (quartier/secteur)
- Saisie de point de repère
- Description détaillée du chemin
- Numéro de téléphone obligatoire
- Estimation automatique du temps de livraison

### OrderTrackingScreen.js
- Suivi en temps réel des commandes
- Statuts détaillés avec icônes
- Informations de contact
- Instructions pour le client
- Temps estimé mis à jour

### PaymentOptions.js (Composant)
- Sélection du mode de paiement
- Options locales (Airtel Money, Tigo Cash)
- Paiement en espèces recommandé
- Interface intuitive avec conseils

## 🔧 Modifications techniques

### Nouveaux slices Redux
- **addressSlice.js** : Gestion des adresses par zones
- **orderSlice.js** : Gestion des commandes avec statuts

### Composants mis à jour
- **HomeScreen** : Intégration sélection d'adresse
- **BasketScreen** : Ajout options de paiement et vérification adresse
- **DeliveryScreen** : Remplacement carte par informations d'adresse

### Fonctionnalités supprimées
- **Géolocalisation GPS** : Remplacée par système de zones
- **Cartes interactives** : Remplacées par descriptions textuelles
- **Tracking en temps réel** : Remplacé par estimations et contact téléphonique

## 🎯 Zones de livraison configurées

| Zone | Distance | Temps estimé |
|------|----------|-------------|
| N'Djamena Centre | 2-5 km | 20-30 min |
| Chagoua | 5-8 km | 30-45 min |
| Moursal | 3-6 km | 25-35 min |
| Ardep Djoumal | 4-7 km | 30-40 min |
| Gassi | 6-10 km | 35-50 min |
| Klemat | 8-12 km | 45-60 min |
| Sabangali | 5-9 km | 30-45 min |
| Angabo | 7-11 km | 40-55 min |
| Goudji | 10-15 km | 50-70 min |
| Kabalaye | 12-18 km | 60-80 min |

## 📞 Workflow de livraison

1. **Commande** → Client sélectionne adresse + paiement
2. **Validation** → Restaurant vérifie disponibilité et zone
3. **Acceptation** → Restaurant confirme temps de préparation
4. **Préparation** → Cuisine prépare la commande
5. **Attribution** → Restaurant assigne un livreur
6. **Livraison** → Livreur contacte client avant arrivée
7. **Confirmation** → Paiement et confirmation de livraison

## 🚧 Fonctionnalités à implémenter

### Prochaines étapes
- [ ] Interface restaurateur (dashboard)
- [ ] Système de notifications SMS
- [ ] Intégration Mobile Money
- [ ] Gestion des livreurs par restaurant
- [ ] Historique des commandes
- [ ] Système de reviews adapté

### Améliorations techniques
- [ ] Mode offline avec synchronisation
- [ ] Optimisation images pour connexion lente
- [ ] Système de cache local
- [ ] Gestion des coupures de courant
- [ ] Backup SMS pour notifications critiques

## 📋 Configuration requise

### Dépendances ajoutées
```json
{
  "react-native-phone-number-input": "^2.x.x",
  "react-native-progress": "^5.0.1",
  "react-native-heroicons": "^4.0.0"
}
```

### Variables d'environnement
```env
SANITY_PROJECT_ID=cq9tdpib
SANITY_DATASET=production
SMS_API_KEY=your_sms_api_key
AIRTEL_MONEY_API=your_airtel_api
TIGO_CASH_API=your_tigo_api
```

## 🤝 Contribution

Cette adaptation a été conçue spécifiquement pour le contexte tchadien. Les contributions sont les bienvenues pour :
- Améliorer l'UX local
- Ajouter de nouvelles zones de livraison
- Optimiser pour les connexions limitées
- Intégrer de nouveaux moyens de paiement locaux

## 📚 Documentation

- [Guide utilisateur](docs/guide-utilisateur.md)
- [Manuel restaurateur](docs/manuel-restaurateur.md)
- [API Documentation](docs/api-documentation.md)
- [Déploiement](docs/deploiement.md)

---

**Développé avec ❤️ pour le marché tchadien** 