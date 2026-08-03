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

    Function("startActivity") { (orderId: String, restaurantName: String) in
      if #available(iOS 16.1, *) {
        Task {
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
              _ = try Activity.request(attributes: attributes, contentState: state, pushType: nil)
            } catch {
              print("Failed to start Live Activity: \(error)")
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
