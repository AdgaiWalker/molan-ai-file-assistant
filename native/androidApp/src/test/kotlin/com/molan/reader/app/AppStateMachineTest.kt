package com.molan.reader.app

import org.junit.Assert.assertEquals
import org.junit.Test

class AppStateMachineTest {
    @Test
    fun invalidRestoredRouteFallsBackToHome() {
        val machine = AppStateMachine(initialRoute = "Unknown")

        assertEquals(AppRoute.Home, machine.snapshot.route)
    }

    @Test
    fun readerRouteCanOpenAndClose() {
        val machine = AppStateMachine(initialRoute = AppRoute.Home.name)

        machine.openReader()
        assertEquals(AppRoute.Reader, machine.snapshot.route)

        machine.closeReader()
        assertEquals(AppRoute.Home, machine.snapshot.route)
    }

    @Test
    fun failedBootstrapCanRetry() {
        var attempts = 0
        val machine = AppStateMachine(initialRoute = null) {
            attempts += 1
            if (attempts == 1) error("first bootstrap fails")
        }

        assertEquals(BootstrapState.Failed, machine.snapshot.bootstrapState)

        machine.retryBootstrap()

        assertEquals(BootstrapState.Ready, machine.snapshot.bootstrapState)
        assertEquals(2, attempts)
    }
}
