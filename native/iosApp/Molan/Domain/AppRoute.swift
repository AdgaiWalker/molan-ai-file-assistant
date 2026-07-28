enum AppRoute: String, CaseIterable {
    case home
    case reader
}

struct AppFailure: Equatable {
    let title: String
    let message: String
    let recoveryTitle: String
}
