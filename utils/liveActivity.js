/**
 * Live Activity utils — Dynamic Island & Lock Screen
 *
 * ⚠️  FONCTIONNE UNIQUEMENT AVEC UN EAS BUILD (pas dans Expo Go).
 *     En mode Expo Go, toutes les fonctions sont des no-ops silencieux.
 *
 * iOS 16.2+ requis pour les Live Activities.
 * Dynamic Island visible sur iPhone 14 Pro+ uniquement.
 */

import { Platform } from 'react-native'

// expo-widgets expose nativement startActivity / updateActivity / endActivity
// seulement quand l'app est buildée avec EAS (extension Widget compilée).
let ExpoWidgets = null
try {
  ExpoWidgets = require('expo-widgets')
} catch {
  // Expo Go ou Android — pas de module natif disponible
}

const IS_SUPPORTED =
  Platform.OS === 'ios' && ExpoWidgets !== null

/** Mapping statut → step (0-4) pour la barre de progression */
const STATUS_TO_STEP = {
  PENDING: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERING: 4,
  DELIVERED: 4,
  CANCELLED: 0,
}

/** Labels en français */
const STATUS_LABELS = {
  PENDING:          'En attente',
  ACCEPTED:         'Acceptée',
  PREPARING:        'En préparation',
  READY:            'Prête à être livrée',
  OUT_FOR_DELIVERY: 'En livraison',
  DELIVERING:       'En livraison',
  DELIVERED:        'Livrée',
  CANCELLED:        'Annulée',
}

let currentActivityId = null

/**
 * Démarre une Live Activity au moment où la commande est passée.
 * @param {object} order  { id, restaurantName, totalXAF, status, estimatedTime }
 */
export async function startOrderActivity(order) {
  if (!IS_SUPPORTED) return

  try {
    const activityId = await ExpoWidgets.startActivity({
      activityType: 'AtlibOrderAttributes',
      // Données statiques
      attributes: {
        orderId: order.id,
        restaurantName: order.restaurantName,
        totalXAF: order.totalXAF || 0,
      },
      // Données dynamiques initiales
      state: {
        status: order.status || 'PENDING',
        statusLabel: STATUS_LABELS[order.status] || 'En attente',
        estimatedTime: order.estimatedTime || '30-45 min',
        step: STATUS_TO_STEP[order.status] || 0,
      },
    })
    currentActivityId = activityId
    console.log('[LiveActivity] started:', activityId)
  } catch (err) {
    console.warn('[LiveActivity] startOrderActivity failed:', err.message)
  }
}

/**
 * Met à jour la Live Activity quand le statut change.
 * Appelé depuis OrderTrackingScreen lors d'un polling ou notification push.
 * @param {string} status  ex: "PREPARING"
 * @param {string|null} estimatedTime  ex: "20 min"
 */
export async function updateOrderActivity(status, estimatedTime = null) {
  if (!IS_SUPPORTED || !currentActivityId) return

  try {
    await ExpoWidgets.updateActivity({
      activityId: currentActivityId,
      state: {
        status,
        statusLabel: STATUS_LABELS[status] || status,
        estimatedTime: estimatedTime || undefined,
        step: STATUS_TO_STEP[status] || 0,
      },
    })
    console.log('[LiveActivity] updated → ', status)
  } catch (err) {
    console.warn('[LiveActivity] updateOrderActivity failed:', err.message)
  }
}

/**
 * Termine la Live Activity (commande livrée ou annulée).
 */
export async function endOrderActivity() {
  if (!IS_SUPPORTED || !currentActivityId) return

  try {
    await ExpoWidgets.endActivity({ activityId: currentActivityId })
    console.log('[LiveActivity] ended:', currentActivityId)
    currentActivityId = null
  } catch (err) {
    console.warn('[LiveActivity] endOrderActivity failed:', err.message)
  }
}
