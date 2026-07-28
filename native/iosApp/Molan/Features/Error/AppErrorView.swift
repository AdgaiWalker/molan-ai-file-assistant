import SwiftUI

struct AppErrorView: View {
    let failure: AppFailure
    let retry: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label(failure.title, systemImage: "exclamationmark.triangle")
        } description: {
            Text(failure.message)
        } actions: {
            Button(failure.recoveryTitle, action: retry)
                .buttonStyle(.borderedProminent)
        }
        .padding()
        .background(MolanTheme.pageBackground)
    }
}
