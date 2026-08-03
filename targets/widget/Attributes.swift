import ActivityKit
import Foundation

// IMPORTANT: This struct must stay byte-for-byte identical (same name, same field
// names and types) to the one declared in the app target's native module
// (modules/live-activity/ios/LiveActivityModule.swift). ActivityKit matches the
// Live Activity between the app and this widget extension purely by this signature.
struct ChadDeliveryAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var status: String
        var deliveryTime: String
        var courierName: String
        var progress: Double // 0.0 to 1.0
    }

    var orderId: String
    var restaurantName: String
}
