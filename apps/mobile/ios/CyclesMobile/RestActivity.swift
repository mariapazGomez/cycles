import ActivityKit
import Foundation
import React

// Puente entre JavaScript y la Live Activity del descanso (isla dinámica y
// pantalla de bloqueo). En iOS anteriores a 16.2 no hace nada.
@objc(RestActivity)
final class RestActivity: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  // Muestra la actividad, o actualiza la que ya está en pantalla.
  @objc(show:endsAtMs:resolve:reject:)
  func show(
    _ startedAtMs: Double,
    endsAtMs: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }
    let endsAt = Date(timeIntervalSince1970: endsAtMs / 1000)
    let startedAt = min(Date(timeIntervalSince1970: startedAtMs / 1000), endsAt)
    Task {
      await RestActivityController.show(startedAt: startedAt, endsAt: endsAt)
      resolve(nil)
    }
  }

  @objc(hide:reject:)
  func hide(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }
    Task {
      await RestActivityController.hide()
      resolve(nil)
    }
  }
}

@available(iOS 16.2, *)
enum RestActivityController {
  static func show(startedAt: Date, endsAt: Date) async {
    let state = RestTimerAttributes.ContentState(startedAt: startedAt, endsAt: endsAt)
    // staleDate = fin del descanso: al llegar, el sistema marca la actividad
    // como vencida y la vista muestra «Descanso terminado».
    let content = ActivityContent(state: state, staleDate: endsAt)
    let current = Activity<RestTimerAttributes>.activities
    if current.isEmpty {
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
      _ = try? Activity.request(attributes: RestTimerAttributes(), content: content, pushType: nil)
    } else {
      for activity in current {
        await activity.update(content)
      }
    }
  }

  static func hide() async {
    for activity in Activity<RestTimerAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}
