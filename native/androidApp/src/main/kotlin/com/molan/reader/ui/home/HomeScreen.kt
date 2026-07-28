package com.molan.reader.ui.home

import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.molan.reader.R
import com.molan.reader.document.LibraryDocument
import com.molan.reader.document.LibraryConflict
import com.molan.reader.document.LibraryUiState
import com.molan.reader.document.SyncUiState
import com.molan.reader.document.SyncNotice
import com.molan.reader.document.SyncFailure
import java.util.Locale

@Composable
fun HomeScreen(
    libraryState: LibraryUiState,
    pickDocument: () -> Unit,
    openDocument: (String) -> Unit,
    setArchived: (String, Boolean) -> Unit,
    syncState: SyncUiState,
    loginSync: (String, String, String) -> Unit,
    logoutSync: () -> Unit,
    queueSync: (String) -> Unit,
    syncNow: () -> Unit,
    conflicts: List<LibraryConflict>,
    deleteDocument: (String, String) -> Unit,
    restoreDocument: (String, String) -> Unit,
    resolveConflict: (String, String) -> Unit,
    exportConflictVersion: (String) -> Unit,
) {
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf(LibraryFilter.Recent) }
    var syncExpanded by rememberSaveable { mutableStateOf(false) }

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(text = stringResource(R.string.home_title), style = MaterialTheme.typography.displayMedium)
            Text(
                text = stringResource(R.string.home_tagline),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyLarge,
            )
            Button(modifier = Modifier.fillMaxWidth(), onClick = pickDocument) {
                Text(stringResource(R.string.open_document))
            }
            OutlinedButton(
                modifier = Modifier.fillMaxWidth(),
                onClick = { syncExpanded = !syncExpanded },
            ) {
                Text(
                    stringResource(
                        if (syncState is SyncUiState.LoggedIn) R.string.sync_settings_connected
                        else R.string.sync_settings,
                    ),
                )
            }
            AnimatedVisibility(
                visible = syncExpanded,
                enter = expandVertically(
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioNoBouncy,
                        stiffness = Spring.StiffnessMedium,
                    ),
                ) + fadeIn(),
                exit = shrinkVertically(
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioNoBouncy,
                        stiffness = Spring.StiffnessMedium,
                    ),
                ) + fadeOut(),
            ) {
                SyncPanel(
                    state = syncState,
                    login = loginSync,
                    logout = logoutSync,
                    syncNow = syncNow,
                )
            }
            Text(stringResource(R.string.library_title), style = MaterialTheme.typography.titleLarge)
            if (conflicts.isNotEmpty()) {
                ConflictSection(
                    conflicts = conflicts,
                    resolve = resolveConflict,
                    exportVersion = exportConflictVersion,
                )
            }
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.library_search)) },
                singleLine = true,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                LibraryFilter.entries.forEach { candidate ->
                    OutlinedButton(onClick = { filter = candidate }) {
                        Text(stringResource(candidate.label))
                    }
                }
            }

            when (libraryState) {
                LibraryUiState.Loading -> Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                ) {
                    CircularProgressIndicator()
                    Text(stringResource(R.string.library_loading))
                }
                LibraryUiState.Failed -> Text(
                    stringResource(R.string.library_failed),
                    color = MaterialTheme.colorScheme.error,
                )
                is LibraryUiState.Ready -> {
                    val resultGroups = libraryState.documents
                        .filter { it.kind == "ai_result" && it.sourceDocumentId != null }
                        .groupBy { requireNotNull(it.sourceDocumentId) }
                    val documents = libraryState.documents.filter { document ->
                        document.title.contains(query, ignoreCase = true) && when (filter) {
                            LibraryFilter.Recent -> true
                            LibraryFilter.Collected -> document.state != "archived" && document.state != "deleted"
                            LibraryFilter.Archived -> document.state == "archived"
                        }
                    }
                    if (documents.isEmpty()) {
                        Text(
                            stringResource(R.string.library_empty),
                            modifier = Modifier.padding(vertical = 28.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            items(documents, key = LibraryDocument::id) { document ->
                                LibraryDocumentCard(
                                    document = document,
                                    open = { openDocument(document.id) },
                                    openSource = { sourceId -> openDocument(sourceId) },
                                    openLatestResult = { resultId -> openDocument(resultId) },
                                    latestResultId = resultGroups[document.id]?.firstOrNull()?.id,
                                    setArchived = { archived -> setArchived(document.id, archived) },
                                    queueSync = { queueSync(document.id) },
                                    deleteDocument = { scope -> deleteDocument(document.id, scope) },
                                    restoreDocument = { scope -> restoreDocument(document.id, scope) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LibraryDocumentCard(
    document: LibraryDocument,
    open: () -> Unit,
    openSource: (String) -> Unit,
    openLatestResult: (String) -> Unit,
    latestResultId: String?,
    setArchived: (Boolean) -> Unit,
    queueSync: () -> Unit,
    deleteDocument: (String) -> Unit,
    restoreDocument: (String) -> Unit,
) {
    var pendingDeleteScope by rememberSaveable { mutableStateOf<String?>(null) }
    var moreExpanded by rememberSaveable { mutableStateOf(false) }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(document.title, style = MaterialTheme.typography.titleMedium, maxLines = 2)
            Text(
                text = "${document.format.uppercase(Locale.ROOT)} · ${formatBytes(document.sizeBytes)} · " +
                    documentStateLabel(document.state),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
            )
            if (document.kind == "ai_result" && document.sourceTitle != null) {
                Text(
                    text = stringResource(R.string.library_ai_result_source, document.sourceTitle),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            if (document.kind == "ai_result" && document.isStale) {
                Text(
                    text = stringResource(R.string.library_ai_result_stale),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Text(
                text = document.contentHash.take(23) + "…",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelSmall,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (document.state == "deleted") {
                    OutlinedButton(onClick = { restoreDocument("current_device") }) {
                        Text(stringResource(R.string.sync_restore_device))
                    }
                    OutlinedButton(onClick = { restoreDocument("cloud") }) {
                        Text(stringResource(R.string.sync_restore_cloud))
                    }
                } else {
                    Button(onClick = open) { Text(stringResource(R.string.library_open)) }
                    if (document.kind == "ai_result" && document.sourceDocumentId != null) {
                        OutlinedButton(onClick = { openSource(document.sourceDocumentId) }) {
                            Text(stringResource(R.string.library_open_source))
                        }
                    } else if (latestResultId != null) {
                        OutlinedButton(onClick = { openLatestResult(latestResultId) }) {
                            Text(stringResource(R.string.library_open_latest_result))
                        }
                    } else if (document.state in setOf("collected", "failed")) {
                        OutlinedButton(onClick = queueSync) {
                            Text(stringResource(R.string.sync_this_document))
                        }
                    }
                    Box {
                        TextButton(onClick = { moreExpanded = true }) {
                            Text(stringResource(R.string.library_more_actions))
                        }
                        DropdownMenu(
                            expanded = moreExpanded,
                            onDismissRequest = { moreExpanded = false },
                        ) {
                            if (document.kind == "ai_result") {
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.library_delete_result)) },
                                    onClick = {
                                        moreExpanded = false
                                        pendingDeleteScope = "current_device"
                                    },
                                )
                            } else {
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            stringResource(
                                                if (document.state == "archived") R.string.library_restore
                                                else R.string.library_archive,
                                            ),
                                        )
                                    },
                                    onClick = {
                                        moreExpanded = false
                                        setArchived(document.state != "archived")
                                    },
                                )
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.sync_delete_device)) },
                                    onClick = {
                                        moreExpanded = false
                                        pendingDeleteScope = "current_device"
                                    },
                                )
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.sync_delete_cloud)) },
                                    onClick = {
                                        moreExpanded = false
                                        pendingDeleteScope = "cloud"
                                    },
                                )
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.sync_delete_all)) },
                                    onClick = {
                                        moreExpanded = false
                                        pendingDeleteScope = "all_devices"
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
    pendingDeleteScope?.let { scope ->
        AlertDialog(
            onDismissRequest = { pendingDeleteScope = null },
            title = { Text(stringResource(R.string.sync_delete_confirm_title)) },
            text = { Text(stringResource(deleteConfirmation(scope))) },
            confirmButton = {
                TextButton(onClick = {
                    pendingDeleteScope = null
                    deleteDocument(scope)
                }) { Text(stringResource(R.string.sync_delete_confirm)) }
            },
            dismissButton = {
                TextButton(onClick = { pendingDeleteScope = null }) { Text(stringResource(R.string.cancel)) }
            },
        )
    }
}

@Composable
private fun ConflictSection(
    conflicts: List<LibraryConflict>,
    resolve: (String, String) -> Unit,
    exportVersion: (String) -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(stringResource(R.string.sync_conflicts_title), style = MaterialTheme.typography.titleMedium)
            conflicts.forEach { conflict ->
                Text(conflict.documentId, style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { exportVersion(conflict.localVersionId) }) {
                        Text(stringResource(R.string.sync_export_local_version))
                    }
                    OutlinedButton(onClick = { exportVersion(conflict.remoteVersionId) }) {
                        Text(stringResource(R.string.sync_export_remote_version))
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { resolve(conflict.id, "keep_local") }) {
                        Text(stringResource(R.string.sync_keep_local))
                    }
                    OutlinedButton(onClick = { resolve(conflict.id, "keep_remote") }) {
                        Text(stringResource(R.string.sync_keep_remote))
                    }
                    OutlinedButton(onClick = { resolve(conflict.id, "save_copy") }) {
                        Text(stringResource(R.string.sync_keep_both))
                    }
                }
            }
        }
    }
}

@StringRes
private fun deleteConfirmation(scope: String): Int = when (scope) {
    "current_device" -> R.string.sync_delete_device_explanation
    "cloud" -> R.string.sync_delete_cloud_explanation
    else -> R.string.sync_delete_all_explanation
}

@Composable
private fun SyncPanel(
    state: SyncUiState,
    login: (String, String, String) -> Unit,
    logout: () -> Unit,
    syncNow: () -> Unit,
) {
    var serverUrl by rememberSaveable { mutableStateOf("http://10.0.2.2:43120") }
    var phone by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(stringResource(R.string.sync_title), style = MaterialTheme.typography.titleMedium)
            when (state) {
                SyncUiState.LoggedOut, is SyncUiState.Failed -> {
                    Text(stringResource(R.string.sync_login_explanation), style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = { serverUrl = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text(stringResource(R.string.sync_server_url)) },
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text(stringResource(R.string.sync_phone)) },
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = code,
                        onValueChange = { code = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text(stringResource(R.string.sync_code)) },
                        singleLine = true,
                    )
                    if (state is SyncUiState.Failed) {
                        Text(stringResource(state.reason.messageResource()), color = MaterialTheme.colorScheme.error)
                    }
                    Button(onClick = { login(serverUrl, phone, code) }) {
                        Text(stringResource(R.string.sync_login))
                    }
                }
                SyncUiState.LoggingIn -> {
                    CircularProgressIndicator()
                    Text(stringResource(R.string.sync_logging_in))
                }
                is SyncUiState.LoggedIn -> {
                    Text(stringResource(R.string.sync_logged_in, state.deviceId.take(18)))
                    state.notice?.let { Text(stringResource(it.messageResource())) }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = syncNow) { Text(stringResource(R.string.sync_now)) }
                        OutlinedButton(onClick = logout) { Text(stringResource(R.string.sync_logout)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun documentStateLabel(state: String): String = stringResource(
    when (state) {
        "ai_result" -> R.string.library_ai_result_state
        "sync_pending" -> R.string.sync_state_pending
        "synced" -> R.string.sync_state_synced
        "failed" -> R.string.sync_state_failed
        "conflict" -> R.string.sync_state_conflict
        "archived" -> R.string.library_archived
        "deleted" -> R.string.sync_state_deleted
        else -> R.string.library_local_state
    },
)

private fun SyncNotice.messageResource(): Int = when (this) {
    SyncNotice.QueueAdded -> R.string.sync_queue_added
    SyncNotice.Syncing -> R.string.sync_started
}

private fun SyncFailure.messageResource(): Int = when (this) {
    SyncFailure.LoginFailed -> R.string.sync_login_failed
    SyncFailure.LoginRequired -> R.string.sync_login_required
    SyncFailure.QueueFailed -> R.string.sync_queue_failed
}

private fun formatBytes(bytes: Long): String = when {
    bytes < 1_024 -> "$bytes B"
    bytes < 1_024 * 1_024 -> "%.1f KB".format(Locale.ROOT, bytes / 1_024.0)
    else -> "%.1f MB".format(Locale.ROOT, bytes / (1_024.0 * 1_024.0))
}

private enum class LibraryFilter(@param:StringRes val label: Int) {
    Recent(R.string.library_recent),
    Collected(R.string.library_collected),
    Archived(R.string.library_archived),
}
