// AtlibOrderWidget.swift
// Live Activity + Dynamic Island pour le suivi de commande Atlib
// iOS 16.2+ requis (Live Activity) — iOS 16.1+ Dynamic Island (iPhone 14 Pro+)
//
// Ce fichier est compilé en tant qu'extension Widget lors du build EAS.
// Il ne peut PAS fonctionner dans Expo Go.
//
// Pour activer : eas build --profile development --platform ios

import ActivityKit
import SwiftUI
import WidgetKit

// ─── Données partagées entre l'app et le widget ──────────────────────────────

struct AtlibOrderAttributes: ActivityAttributes {
  // Données statiques (ne changent pas)
  struct ContentState: Codable, Hashable {
    var status: String          // "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED"
    var statusLabel: String     // "En attente" | "En préparation" etc.
    var estimatedTime: String?  // "25-35 min"
    var step: Int               // 0..4 pour la barre de progression
  }

  var orderId: String
  var restaurantName: String
  var totalXAF: Int
}

// ─── Labels et couleurs des statuts ──────────────────────────────────────────

private func stepIcon(for step: Int) -> String {
  switch step {
  case 0: return "clock"
  case 1: return "checkmark.circle"
  case 2: return "flame"
  case 3: return "bag.fill"
  case 4: return "bicycle"
  default: return "clock"
  }
}

private func accentColor(for status: String) -> Color {
  switch status {
  case "DELIVERING", "OUT_FOR_DELIVERY": return Color(red: 0.12, green: 0.47, blue: 0.24)
  case "DELIVERED": return Color(red: 0.04, green: 0.37, blue: 0.25)
  case "CANCELLED": return Color(red: 0.6, green: 0.0, blue: 0.0)
  default: return Color(red: 0.48, green: 0.12, blue: 0.23)   // #7A1E3A
  }
}

// ─── Vue Lock Screen (bandeau) ────────────────────────────────────────────────

struct AtlibLockScreenView: View {
  let context: ActivityViewContext<AtlibOrderAttributes>

  var body: some View {
    let state = context.state
    let accent = accentColor(for: state.status)

    VStack(spacing: 10) {
      HStack {
        Image(systemName: stepIcon(for: state.step))
          .foregroundColor(accent)
          .font(.system(size: 16, weight: .semibold))

        VStack(alignment: .leading, spacing: 2) {
          Text(context.attributes.restaurantName)
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(.primary)
          Text(state.statusLabel)
            .font(.system(size: 12))
            .foregroundColor(.secondary)
        }
        Spacer()
        if let time = state.estimatedTime {
          VStack(alignment: .trailing, spacing: 2) {
            Text(time)
              .font(.system(size: 14, weight: .bold))
              .foregroundColor(accent)
            Text("estimé")
              .font(.system(size: 10))
              .foregroundColor(.secondary)
          }
        }
      }

      // Progress bar
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          RoundedRectangle(cornerRadius: 3)
            .fill(Color.secondary.opacity(0.2))
            .frame(height: 5)
          RoundedRectangle(cornerRadius: 3)
            .fill(accent)
            .frame(width: geo.size.width * CGFloat(state.step) / 4.0, height: 5)
            .animation(.easeInOut(duration: 0.6), value: state.step)
        }
      }
      .frame(height: 5)
    }
    .padding(14)
  }
}

// ─── Dynamic Island — vue compacte ───────────────────────────────────────────

struct AtlibDICompactLeading: View {
  let context: ActivityViewContext<AtlibOrderAttributes>
  var body: some View {
    Image(systemName: stepIcon(for: context.state.step))
      .foregroundColor(accentColor(for: context.state.status))
      .font(.system(size: 14, weight: .semibold))
  }
}

struct AtlibDICompactTrailing: View {
  let context: ActivityViewContext<AtlibOrderAttributes>
  var body: some View {
    Text(context.state.statusLabel)
      .font(.system(size: 11, weight: .semibold))
      .foregroundColor(.primary)
      .lineLimit(1)
  }
}

// ─── Dynamic Island — vue minimale ───────────────────────────────────────────

struct AtlibDIMinimal: View {
  let context: ActivityViewContext<AtlibOrderAttributes>
  var body: some View {
    Image(systemName: stepIcon(for: context.state.step))
      .foregroundColor(accentColor(for: context.state.status))
      .font(.system(size: 12, weight: .bold))
  }
}

// ─── Dynamic Island — vue étendue ────────────────────────────────────────────

struct AtlibDIExpanded: View {
  let context: ActivityViewContext<AtlibOrderAttributes>

  var body: some View {
    let state = context.state
    let accent = accentColor(for: state.status)

    HStack(spacing: 16) {
      // Leading: icon + step
      VStack(spacing: 4) {
        Image(systemName: stepIcon(for: state.step))
          .font(.system(size: 22, weight: .semibold))
          .foregroundColor(accent)
        Text("\(state.step)/4")
          .font(.system(size: 9))
          .foregroundColor(.secondary)
      }
      .frame(width: 48)

      // Center: restaurant + status
      VStack(alignment: .leading, spacing: 3) {
        Text(context.attributes.restaurantName)
          .font(.system(size: 13, weight: .bold))
          .foregroundColor(.primary)
          .lineLimit(1)
        Text(state.statusLabel)
          .font(.system(size: 11))
          .foregroundColor(.secondary)
      }

      Spacer()

      // Trailing: estimated time
      if let time = state.estimatedTime {
        VStack(alignment: .trailing, spacing: 2) {
          Text(time)
            .font(.system(size: 15, weight: .bold))
            .foregroundColor(accent)
          Text("estimé")
            .font(.system(size: 9))
            .foregroundColor(.secondary)
        }
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 8)
  }
}

// ─── Widget Bundle registration ───────────────────────────────────────────────

@available(iOS 16.2, *)
struct AtlibOrderWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: AtlibOrderAttributes.self) { context in
      AtlibLockScreenView(context: context)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          AtlibDICompactLeading(context: context)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if let time = context.state.estimatedTime {
            Text(time)
              .font(.system(size: 13, weight: .bold))
              .foregroundColor(accentColor(for: context.state.status))
          }
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.restaurantName)
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(.primary)
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.state.statusLabel)
            .font(.system(size: 11))
            .foregroundColor(.secondary)
        }
      } compactLeading: {
        AtlibDICompactLeading(context: context)
      } compactTrailing: {
        AtlibDICompactTrailing(context: context)
      } minimal: {
        AtlibDIMinimal(context: context)
      }
    }
  }
}

@main
struct AtlibWidgetBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 16.2, *) {
      AtlibOrderWidget()
    }
  }
}
