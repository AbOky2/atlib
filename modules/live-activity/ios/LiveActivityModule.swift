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
  private let operationLock = NSLock()
  private var pendingOperation: Task<Void, Never>?

  // Bridge calls arrive synchronously, but ActivityKit operations suspend.
  // Preserve start → update → end ordering across those suspension points.
  private func enqueue(_ operation: @escaping () async -> Void) {
    operationLock.lock()
    let previous = pendingOperation
    pendingOperation = Task {
      await previous?.value
      await operation()
    }
    operationLock.unlock()
  }

  private var watched = Set<String>()

  @available(iOS 16.2, *)
  private func watchToken(_ activity: Activity<ChadDeliveryAttributes>, orderId: String) {
    if let token = activity.pushToken {
      sendEvent("onPushTokenChange", ["orderId": orderId, "token": token.map { String(format: "%02x", $0) }.joined()])
    }
    guard watched.insert(activity.id).inserted else { return }
    Task { [weak self] in
      for await tokenData in activity.pushTokenUpdates {
        self?.sendEvent("onPushTokenChange", ["orderId": orderId, "token": tokenData.map { String(format: "%02x", $0) }.joined()])
      }
    }
  }

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
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    /// True when an activity for this app is actually live right now. The UI
    /// uses it so it never promises a lock-screen tracker that isn't there.
    Function("isActivityRunning") { () -> Bool in
      if #available(iOS 16.2, *) {
        return !Activity<ChadDeliveryAttributes>.activities.isEmpty
      }
      return false
    }

    Function("startActivity") { (orderId: String, restaurantName: String) in
      if #available(iOS 16.2, *) {
        self.enqueue { [weak self] in
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                self?.sendEvent("onActivityError", [
                    "message": "Les activités en direct sont désactivées pour cette app (Réglages → Naakul → Activités en direct)."
                ])
                return
            }

            for activity in Activity<ChadDeliveryAttributes>.activities {
                if activity.attributes.orderId == orderId {
                    self?.watchToken(activity, orderId: orderId)
                    return
                }
                await activity.end(dismissalPolicy: .immediate)
            }

            let attributes = ChadDeliveryAttributes(orderId: orderId, restaurantName: restaurantName)
            // PENDING is truthful and obtains the APNs token before suspension.
            let state = ChadDeliveryAttributes.ContentState(
                status: "En attente du restaurant",
                deliveryTime: "—",
                courierName: "Livraison par le restaurant",
                progress: 0.1
            )

            do {
              // `.token` asks ActivityKit for an APNs token so the server can
              // drive this activity once the app is gone.
              let activity = try Activity.request(
                attributes: attributes,
                contentState: state,
                pushType: .token
              )

              self?.watchToken(activity, orderId: orderId)
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
      if #available(iOS 16.2, *) {
        self.enqueue {
          let updatedState = ChadDeliveryAttributes.ContentState(status: status, deliveryTime: deliveryTime, courierName: courierName, progress: progress)
          for activity in Activity<ChadDeliveryAttributes>.activities {
            await activity.update(using: updatedState)
          }
        }
      }
    }

    Function("endActivity") { () in
      if #available(iOS 16.2, *) {
        self.enqueue {
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
      if #available(iOS 16.2, *) {
        self.enqueue {
          let finalState = ChadDeliveryAttributes.ContentState(
            status: status,
            deliveryTime: progress >= 1 ? "Livrée" : "—",
            courierName: progress >= 1 ? "Merci pour votre commande" : "",
            progress: progress
          )
          for activity in Activity<ChadDeliveryAttributes>.activities {
            // `end(using:)` is deprecated in 16.2 but keeps the module buildable
            // from iOS 16.2 — same behaviour as the ActivityContent overload.
            await activity.end(using: finalState, dismissalPolicy: .after(Date(timeIntervalSinceNow: 240)))
          }
        }
      }
    }
  }
}
