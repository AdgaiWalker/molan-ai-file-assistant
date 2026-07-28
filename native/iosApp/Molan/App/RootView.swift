import SwiftUI

struct RootView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var route = AppRoute.home
    @State private var model = AppModel()

    var body: some View {
        Group {
            switch model.bootstrapState {
            case .ready:
                NavigationStack {
                    routeView
                }
                .tint(MolanTheme.accent)
            case .failed(let failure):
                AppErrorView(failure: failure, retry: model.retryBootstrap)
            }
        }
        .onOpenURL { url in
            if url.scheme == AppGroupInbox.openURL.scheme {
                claimPendingShare()
            } else {
                model.openDocument(url)
                route = .reader
            }
        }
        .task {
            await model.restoreSyncState()
            route = await model.restoreDocumentSession() ? .reader : .home
            claimPendingShare()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                claimPendingShare()
                model.syncNow()
            }
        }
    }

    @ViewBuilder
    private var routeView: some View {
        switch route {
        case .home:
            HomeView(
                documents: model.libraryDocuments,
                libraryFailure: model.libraryFailure,
                conflicts: model.conflicts,
                syncState: model.syncState,
                openDocument: { url in
                    model.openDocument(url)
                    route = .reader
                },
                openLibraryDocument: { id in
                    model.openLibraryDocument(id)
                    route = .reader
                },
                setArchived: model.setArchived,
                loginSync: model.loginSync,
                logoutSync: model.logoutSync,
                enqueueSync: model.enqueueSync,
                syncNow: model.syncNow,
                deleteDocument: model.deleteDocument,
                restoreDocument: model.restoreDeletedDocument,
                resolveConflict: model.resolveConflict,
                exportConflictVersion: model.prepareConflictVersionExport,
                retryLibrary: { Task { await model.refreshLibrary() } }
            )
            .task { await model.refreshLibrary() }
        case .reader:
            ReaderView(
                state: model.documentState,
                close: {
                    model.clearDocument()
                    route = .home
                },
                retry: model.retryDocument,
                collect: model.collect
            )
        }
    }

    private func claimPendingShare() {
        Task {
            guard let url = try? await Task.detached(priority: .userInitiated, operation: {
                try AppGroupInbox.claimNewest()
            }).value else { return }
            model.openDocument(url)
            route = .reader
        }
    }
}
