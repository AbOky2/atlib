/**
 * Source de vérité unique pour les statuts de commande.
 * Importé depuis OrdersScreen, OrderDetailsScreen, OrderTrackingScreen, etc.
 */

export const ORDER_STATUS_CONFIG = {
  PENDING: {
    label:   'En attente',
    color:   '#92400e',
    bgColor: '#fef3c7',
    step:    0,
  },
  ACCEPTED: {
    label:   'Acceptée',
    color:   '#1e3a8a',
    bgColor: '#dbeafe',
    step:    1,
  },
  PREPARING: {
    label:   'En préparation',
    color:   '#7A1E3A',
    bgColor: '#f8e9ef',
    step:    2,
  },
  READY: {
    label:   'Prête',
    color:   '#065f46',
    bgColor: '#d1fae5',
    step:    3,
  },
  OUT_FOR_DELIVERY: {
    label:   'En livraison',
    color:   '#4c1d95',
    bgColor: '#ede9fe',
    step:    4,
  },
  DELIVERED: {
    label:   'Livrée',
    color:   '#065f46',
    bgColor: '#d1fae5',
    step:    4,
  },
  CANCELLED: {
    label:   'Annulée',
    color:   '#991b1b',
    bgColor: '#fee2e2',
    step:    0,
  },
}

/** Labels courts pour les selectors Redux (remplace orderStatuses du state). */
export const ORDER_STATUS_LABELS = Object.fromEntries(
  Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => [k, v.label]),
)
