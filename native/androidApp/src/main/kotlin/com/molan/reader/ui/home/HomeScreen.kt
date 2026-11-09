package com.molan.reader.ui.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
                    val latestResultIds = latestResultIdsBySource(libraryState.documents)
                    val documents = filterLibraryDocuments(libraryState.documents, filter, query)
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
                                    latestResultId = latestResultIds[document.id],
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
