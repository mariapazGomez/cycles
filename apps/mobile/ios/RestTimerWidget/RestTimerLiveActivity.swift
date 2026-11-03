import ActivityKit
import SwiftUI
import WidgetKit

private let brand = Color(red: 0.188, green: 0.502, blue: 0.988)

@main
struct RestTimerWidgetBundle: WidgetBundle {
  var body: some Widget {
    RestTimerLiveActivity()
  }
}

@available(iOS 16.2, *)
struct RestTimerLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RestTimerAttributes.self) { context in
      LockScreenView(state: context.state, isStale: context.isStale)
        .padding(16)
        .activityBackgroundTint(Color(red: 0.122, green: 0.133, blue: 0.157))
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label("Descanso", systemImage: "timer")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(brand)
        }
        DynamicIslandExpandedRegion(.trailing) {
          CountdownText(state: context.state, isStale: context.isStale)
            .font(.title2.monospacedDigit().weight(.bold))
            .frame(maxWidth: 90, alignment: .trailing)
        }
        DynamicIslandExpandedRegion(.bottom) {
          ProgressBar(state: context.state, isStale: context.isStale)
        }
      } compactLeading: {
        Image(systemName: "timer").foregroundStyle(brand)
      } compactTrailing: {
        CountdownText(state: context.state, isStale: context.isStale)
          .font(.caption.monospacedDigit().weight(.semibold))
          .frame(width: 44)
      } minimal: {
        Image(systemName: "timer").foregroundStyle(brand)
      }
      .keylineTint(brand)
    }
  }
}

// El rango de una cuenta regresiva exige inicio <= fin; si el descanso ya
// terminó se usa un rango vacío en vez de fallar.
private func range(_ state: RestTimerAttributes.ContentState) -> ClosedRange<Date> {
  state.startedAt <= state.endsAt ? state.startedAt...state.endsAt : state.endsAt...state.endsAt
}

@available(iOS 16.2, *)
private struct CountdownText: View {
  let state: RestTimerAttributes.ContentState
  let isStale: Bool

  var body: some View {
    if isStale {
      Text("Listo").foregroundStyle(brand)
    } else {
      Text(timerInterval: Date.now...max(Date.now, state.endsAt), countsDown: true)
        .multilineTextAlignment(.trailing)
    }
  }
}

@available(iOS 16.2, *)
private struct ProgressBar: View {
  let state: RestTimerAttributes.ContentState
  let isStale: Bool

  var body: some View {
    if isStale {
      ProgressView(value: 1).tint(brand)
    } else {
      ProgressView(timerInterval: range(state), countsDown: true) {
        EmptyView()
      } currentValueLabel: {
        EmptyView()
      }
      .tint(brand)
    }
  }
}

@available(iOS 16.2, *)
private struct LockScreenView: View {
  let state: RestTimerAttributes.ContentState
  let isStale: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Label(isStale ? "Descanso terminado" : "Descanso", systemImage: "timer")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(brand)
        Spacer()
        CountdownText(state: state, isStale: isStale)
          .font(.title.monospacedDigit().weight(.bold))
          .foregroundStyle(.white)
      }
      ProgressBar(state: state, isStale: isStale)
    }
  }
}
