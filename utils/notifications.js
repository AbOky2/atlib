import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

// ─── Global notification handler ──────────────────────────────────────────
// Called whenever a notification arrives while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// ─── Android — dedicated high-priority channel for orders ─────────────────
export const ORDER_CHANNEL_ID = 'order-updates'

async function ensureOrderChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(ORDER_CHANNEL_ID, {
    name: 'Suivi de commande',
    importance: Notifications.AndroidImportance.MAX, // heads-up + lock screen
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7A1E3A',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    description: 'Mises à jour en temps réel de vos commandes Atlib',
  })
}

// ─── Permission + token registration ─────────────────────────────────────
export const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.')
    return null
  }

  await ensureOrderChannel()

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: true,
        // Enables lock-screen notifications & critical alerts
        allowProvisional: false,
        providesAppNotificationSettings: true,
      },
    })
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied.')
    return null
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    return tokenData.data
  } catch (err) {
    console.warn('Push token unavailable:', err.message)
    return null
  }
}

// ─── Helpers for scheduling local order-status notifications ─────────────
const STATUS_MESSAGES = {
  ACCEPTED: { title: 'Commande acceptée ✓', body: 'Le restaurant a accepté votre commande.' },
  PREPARING: { title: 'En préparation 👨‍🍳', body: 'Votre commande est en cours de préparation.' },
  READY: { title: 'Commande prête 📦', body: 'Votre commande est prête à être récupérée.' },
  OUT_FOR_DELIVERY: { title: 'En route 🏍️', body: 'Votre commande est en cours de livraison !' },
  DELIVERED: { title: 'Livré 🎉', body: 'Votre commande a bien été livrée. Bon appétit !' },
  CANCELLED: { title: 'Commande annulée', body: 'Votre commande a été annulée.' },
}

/**
 * Schedule a local notification when order status changes (foreground polling).
 * Used as fallback when the remote push wasn't received.
 */
export const scheduleOrderStatusNotification = async (status, restaurantName, orderId) => {
  const msg = STATUS_MESSAGES[status]
  if (!msg) return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: restaurantName ? `${restaurantName} — ${msg.body}` : msg.body,
      sound: 'default',
      data: { type: 'order_status', orderId },
      ...(Platform.OS === 'android' && { channelId: ORDER_CHANNEL_ID }),
    },
    trigger: null, // immediate
  })
}
