import ActivityKit
import WidgetKit
import SwiftUI

// NOIR design tokens — mirror src/lib/palette.ts.
private let brand = Color(red: 1.0, green: 0.34, blue: 0.2) // #FF5733
private let inkOnDark = Color.white
private let mutedOnDark = Color.white.opacity(0.55)

/// The lifecycle is encoded in `progress` (see src/lib/orderStatus.ts) — map it
/// back to a step icon without touching the ContentState contract.
/// ⚠️ These bucket boundaries are a contract with STATUS_META.progress; it is
/// locked by tests/liveActivityContract.test.cjs so the two can't drift apart.
private func stepSymbol(for progress: Double, status: String = "") -> String {
    if status.localizedCaseInsensitiveContains("annul") { return "xmark.circle.fill" }
    switch progress {
    case ..<0.2: return "hourglass"
    case ..<0.35: return "checkmark.seal.fill"
    case ..<0.55: return "flame.fill"
    case ..<0.75: return "bag.fill"
    // The restaurant delivers itself, by moto in N'Djamena — not by bicycle.
    case ..<0.95: return "scooter"
    default: return "checkmark.circle.fill"
    }
}

/// Deep link to THIS order's tracking screen.
///
/// expo-router maps `app/(client)/tracking.tsx` to `/tracking` — the `(client)`
/// group never appears in the URL — and the screen reads `orderId` from the
/// QUERY string. A path segment (`/tracking/<id>`) matches no route at all and
/// would drop the user on the not-found screen.
private func trackingURL(_ orderId: String) -> URL? {
    let id = orderId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? orderId
    return URL(string: "chaddelivery://tracking?orderId=\(id)")
}

private func stepIndex(for progress: Double) -> Int {
    switch progress {
    case ..<0.2: return 0
    case ..<0.35: return 1
    case ..<0.55: return 2
    case ..<0.75: return 3
    case ..<0.95: return 4
    default: return 5
    }
}

@available(iOS 16.2, *)
struct ChadDeliveryLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ChadDeliveryAttributes.self) { context in
            LockScreenView(context: context)
                .padding(18)
                .activityBackgroundTint(Color(red: 0.055, green: 0.05, blue: 0.05).opacity(0.96))
                .activitySystemActionForegroundColor(.white)
                // Without this, tapping the LOCK SCREEN activity just opened the
                // app on Home — only the Dynamic Island carried a destination.
                .widgetURL(trackingURL(context.attributes.orderId))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 7) {
                        ZStack {
                            Circle().fill(brand.opacity(0.18)).frame(width: 30, height: 30)
                            Image(systemName: stepSymbol(for: context.state.progress, status: context.state.status))
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(brand)
                        }
                        Text("Naakul")
                            .font(.system(size: 14, weight: .black, design: .rounded))
                            .foregroundColor(inkOnDark)
                            .tracking(0.3)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text(context.state.deliveryTime)
                            .font(.system(size: 16, weight: .heavy, design: .rounded))
                            .foregroundColor(inkOnDark)
                        Text(context.state.progress >= 1 || context.state.status.localizedCaseInsensitiveContains("annul") ? "commande" : (context.state.progress < 0.2 ? "confirmation" : "arrivée"))
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(mutedOnDark)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(context.state.status)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(inkOnDark)
                            Spacer()
                            Text(context.attributes.restaurantName)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(mutedOnDark)
                                .lineLimit(1)
                        }
                        if !context.state.status.localizedCaseInsensitiveContains("annul") { SegmentedProgress(progress: context.state.progress) }
                    }
                    .padding(.top, 6)
                }
            } compactLeading: {
                Image(systemName: stepSymbol(for: context.state.progress, status: context.state.status))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(brand)
            } compactTrailing: {
                Text(context.state.deliveryTime)
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundColor(inkOnDark)
            } minimal: {
                Image(systemName: stepSymbol(for: context.state.progress, status: context.state.status))
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(brand)
            }
            .widgetURL(trackingURL(context.attributes.orderId))
            .keylineTint(brand)
        }
    }
}

@available(iOS 16.2, *)
private struct LockScreenView: View {
    let context: ActivityViewContext<ChadDeliveryAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header: brand + restaurant on the left, ETA on the right.
            HStack(alignment: .center) {
                HStack(spacing: 10) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(brand.opacity(0.16))
                            .frame(width: 38, height: 38)
                        Image(systemName: stepSymbol(for: context.state.progress, status: context.state.status))
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(brand)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Text("Naakul")
                                .font(.system(size: 12, weight: .black, design: .rounded))
                                .foregroundColor(inkOnDark)
                                .tracking(0.5)
                            Circle().fill(brand).frame(width: 4, height: 4)
                        }
                        Text(context.attributes.restaurantName)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(inkOnDark)
                            .lineLimit(1)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 1) {
                    Text(context.state.deliveryTime)
                        .font(.system(size: 21, weight: .heavy, design: .rounded))
                        .foregroundColor(inkOnDark)
                    Text(context.state.progress >= 1 || context.state.status.localizedCaseInsensitiveContains("annul") ? "commande" : (context.state.progress < 0.2 ? "confirmation" : "arrivée"))
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(mutedOnDark)
                }
            }

            if !context.state.status.localizedCaseInsensitiveContains("annul") { SegmentedProgress(progress: context.state.progress) }

            // Footer: status headline + context line.
            HStack(alignment: .firstTextBaseline) {
                Text(context.state.status)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(brand)
                Spacer()
                Text(context.state.courierName)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(mutedOnDark)
                    .lineLimit(1)
            }
        }
    }
}

/// Five-segment lifecycle bar — the same language as the in-app tracker.
@available(iOS 16.2, *)
private struct SegmentedProgress: View {
    let progress: Double

    var body: some View {
        let current = stepIndex(for: progress)
        HStack(spacing: 5) {
            ForEach(0..<5, id: \.self) { i in
                Capsule()
                    .fill(i < current ? brand : (i == current ? brand.opacity(0.55) : Color.white.opacity(0.14)))
                    .frame(height: 6)
            }
        }
    }
}
