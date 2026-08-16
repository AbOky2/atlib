import ExpoModulesCore
import ActivityKit
import Foundation

// Re-declare the struct here so the main app target can build it.
// ActivityKit matches by the struct signature.
struct ChadDeliveryAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var status: String
        var deliveryTime: String
        var courierName: String
        var progress: Double
    }
    var orderId: String
    var restaurantName: String
}

public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    // Emitted every time ActivityKit issues (or rotates) the APNs token for the
    // running activity. Without this the Live Activity could only ever be
    // updated while the app was awake — i.e. almost never, since the lock screen
    // is read precisely when the app is suspended.
    // `onActivityError` exists because a failed `Activity.request` used to only
    // print to a console nobody reads on a device build: the feature simply
    // appeared not to work, with no way to tell why.
    Events("onPushTokenChange", "onActivityError")

    /// False when the OS or the user has Live Activities switched off, and on
    /// iOS < 16.1. Distinguishes "not supported" from "our code is broken".
    Function("areActivitiesEnabled") { () -> Bool in
      if #available(iOS 16.1, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    /// True when an activity for this app is actually live right now. The UI
    /// uses it so it never promises a lock-screen tracker that isn't there.
    Function("isActivityRunning") { () -> Bool in
      if #available(iOS 16.1, *) {
        return !Activity<ChadDeliveryAttributes>.activities.isEmpty
      }
      return false
    }

    Function("startActivity") { (orderId: String, restaurantName: String) in
      if #available(iOS 16.1, *) {
        Task { [weak self] in
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                self?.sendEvent("onActivityError", [
                    "message": "Les activités en direct sont désactivées pour cette app (Réglages → NOIR Delivery → Activités en direct)."
                ])
                return
            }

            // End any existing activities to prevent duplicates
            for activity in Activity<ChadDeliveryAttributes>.activities {
                await activity.end(dismissalPolicy: .immediate)
            }

            let attributes = ChadDeliveryAttributes(orderId: orderId, restaurantName: restaurantName)
            // The activity starts when the restaurant CONFIRMS — the first real
            // update lands right after, so this initial state barely shows.
            let state = ChadDeliveryAttributes.ContentState(
                status: "Commande confirmée",
                deliveryTime: "—",
                courierName: "Livraison par le restaurant",
                progress: 0.25
            )

            do {
              // `.token` asks ActivityKit for an APNs token so the server can
              // drive this activity once the app is gone.
              let activity = try Activity.request(
                attributes: attributes,
                contentState: state,
                pushType: .token
              )

              // The token arrives asynchronously and can be rotated by the
              // system, so we stream every value rather than reading once.
              Task { [weak self] in
                for await tokenData in activity.pushTokenUpdates {
                  let token = tokenData.map { String(format: "%02x", $0) }.joined()
                  self?.sendEvent("onPushTokenChange", [
                    "orderId": orderId,
                    "token": token
                  ])
                }
              }
            } catch {
              // The usual cause is a missing widget EXTENSION in the build:
              // without an ActivityConfiguration registered for these attributes,
              // ActivityKit has nothing to draw and refuses the request.
              print("Failed to start Live Activity: \(error)")
              self?.sendEvent("onActivityError", [
                "message": "Activity.request a échoué : \(error.localizedDescription). Vérifiez que l'extension widget est bien embarquée dans le build."
              ])
            }
        }
      }
    }

    Function("updateActivity") { (status: String, progress: Double, courierName: String, deliveryTime: String) in
      if #available(iOS 16.1, *) {
        Task {
          let updatedState = ChadDeliveryAttributes.ContentState(status: status, deliveryTime: deliveryTime, courierName: courierName, progress: progress)
          for activity in Activity<ChadDeliveryAttributes>.activities {
            await activity.update(using: updatedState)
          }
        }
      }
    }

    Function("endActivity") { () in
      if #available(iOS 16.1, *) {
        Task {
          for activity in Activity<ChadDeliveryAttributes>.activities {
            await activity.end(dismissalPolicy: .immediate)
          }
        }
      }
    }

    // Premium ending: show the terminal state ("Livrée · Bon appétit !") on the
    // lock screen for a few minutes before the system dismisses it, instead of
    // vanishing the moment the order completes.
    Function("endActivityWithFinalState") { (status: String, progress: Double) in
      if #available(iOS 16.1, *) {
        Task {
          let finalState = ChadDeliveryAttributes.ContentState(
            status: status,
            deliveryTime: progress >= 1 ? "Livrée" : "—",
            courierName: progress >= 1 ? "Merci pour votre commande" : "",
            progress: progress
          )
          for activity in Activity<ChadDeliveryAttributes>.activities {
            // `end(using:)` is deprecated in 16.2 but keeps the module buildable
            // from iOS 16.1 — same behaviour as the ActivityContent overload.
            await activity.end(using: finalState, dismissalPolicy: .after(Date(timeIntervalSinceNow: 240)))
          }
        }
      }
    }
  }
}
