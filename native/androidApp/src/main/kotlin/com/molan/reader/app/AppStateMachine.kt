package com.molan.reader.app

enum class AppRoute {
    Home,
    Reader,
}

sealed interface BootstrapState {
    data object Ready : BootstrapState
    data object Failed : BootstrapState
}

data class AppSnapshot(
    val route: AppRoute,
    val bootstrapState: BootstrapState,
)

class AppStateMachine(
    initialRoute: String?,
    private val bootstrap: () -> Unit = {},
) {
    var snapshot = AppSnapshot(
        route = AppRoute.entries.firstOrNull { it.name == initialRoute } ?: AppRoute.Home,
        bootstrapState = runBootstrap(),
    )
        private set

    fun openReader() {
        snapshot = snapshot.copy(route = AppRoute.Reader)
    }

    fun closeReader() {
        snapshot = snapshot.copy(route = AppRoute.Home)
    }

    fun retryBootstrap() {
        snapshot = snapshot.copy(bootstrapState = runBootstrap())
    }

    private fun runBootstrap(): BootstrapState = try {
        bootstrap()
        BootstrapState.Ready
    } catch (_: Exception) {
        BootstrapState.Failed
    }
}
