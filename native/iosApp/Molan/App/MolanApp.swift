import SwiftUI
import UIKit

final class MolanAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        handleEventsForBackgroundURLSession identifier: String,
        completionHandler: @escaping () -> Void
    ) {
        BackgroundUploadSession.shared.handleEvents(completion: completionHandler)
    }
}

@main
struct MolanApp: App {
    @UIApplicationDelegateAdaptor(MolanAppDelegate.self) private var appDelegate
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
