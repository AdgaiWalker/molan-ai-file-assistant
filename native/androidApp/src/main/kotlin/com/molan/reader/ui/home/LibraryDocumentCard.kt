package com.molan.reader.ui.home

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.molan.reader.R
import com.molan.reader.document.LibraryDocument
import java.util.Locale

@Composable
internal fun LibraryDocumentCard(
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
            if (document.kind == AI_RESULT_KIND && document.sourceTitle != null) {
                Text(
                    text = stringResource(R.string.library_ai_result_source, document.sourceTitle),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            if (document.kind == AI_RESULT_KIND && document.isStale) {
                Text(
                    text = stringResource(R.string.library_ai_result_stale),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Text(
                text = document.contentHash.take(HASH_PREVIEW_LENGTH) + "…",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelSmall,
            )
            DocumentActions(
                document = document,
                latestResultId = latestResultId,
                open = open,
                openSource = openSource,
                openLatestResult = openLatestResult,
                setArchived = setArchived,
                queueSync = queueSync,
                restoreDocument = restoreDocument,
                moreExpanded = moreExpanded,
                setMoreExpanded = { moreExpanded = it },
                requestDelete = { pendingDeleteScope = it },
            )
        }
    }

    pendingDeleteScope?.let { scope ->
        DeleteConfirmationDialog(
            scope = scope,
            confirm = {
                pendingDeleteScope = null
                deleteDocument(scope)
            },
            dismiss = { pendingDeleteScope = null },
        )
    }
}

@Composable
private fun DocumentActions(
    document: LibraryDocument,
    latestResultId: String?,
    open: () -> Unit,
    openSource: (String) -> Unit,
    openLatestResult: (String) -> Unit,
    setArchived: (Boolean) -> Unit,
    queueSync: () -> Unit,
    restoreDocument: (String) -> Unit,
    moreExpanded: Boolean,
    setMoreExpanded: (Boolean) -> Unit,
    requestDelete: (String) -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (document.state == DELETED_STATE) {
            OutlinedButton(onClick = { restoreDocument(CURRENT_DEVICE_SCOPE) }) {
                Text(stringResource(R.string.sync_restore_device))
            }
            OutlinedButton(onClick = { restoreDocument(CLOUD_SCOPE) }) {
                Text(stringResource(R.string.sync_restore_cloud))
            }
            return@Row
        }

        Button(onClick = open) { Text(stringResource(R.string.library_open)) }
        when {
            document.kind == AI_RESULT_KIND && document.sourceDocumentId != null -> {
                OutlinedButton(onClick = { openSource(document.sourceDocumentId) }) {
                    Text(stringResource(R.string.library_open_source))
                }
            }
            latestResultId != null -> {
                OutlinedButton(onClick = { openLatestResult(latestResultId) }) {
                    Text(stringResource(R.string.library_open_latest_result))
                }
            }
            document.state in SYNCABLE_STATES -> {
                OutlinedButton(onClick = queueSync) {
                    Text(stringResource(R.string.sync_this_document))
                }
            }
        }
        MoreActionsMenu(
            document = document,
            expanded = moreExpanded,
            setExpanded = setMoreExpanded,
            setArchived = setArchived,
            requestDelete = requestDelete,
        )
    }
}

@Composable
private fun MoreActionsMenu(
    document: LibraryDocument,
    expanded: Boolean,
    setExpanded: (Boolean) -> Unit,
    setArchived: (Boolean) -> Unit,
    requestDelete: (String) -> Unit,
) {
    Box {
        TextButton(onClick = { setExpanded(true) }) {
            Text(stringResource(R.string.library_more_actions))
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { setExpanded(false) }) {
            if (document.kind == AI_RESULT_KIND) {
                DropdownMenuItem(
                    text = { Text(stringResource(R.string.library_delete_result)) },
                    onClick = {
                        setExpanded(false)
                        requestDelete(CURRENT_DEVICE_SCOPE)
                    },
                )
                return@DropdownMenu
            }

            DropdownMenuItem(
                text = {
                    Text(
                        stringResource(
                            if (document.state == ARCHIVED_STATE) R.string.library_restore
                            else R.string.library_archive,
                        ),
                    )
                },
                onClick = {
                    setExpanded(false)
                    setArchived(document.state != ARCHIVED_STATE)
                },
            )
            DeleteMenuItem(R.string.sync_delete_device, CURRENT_DEVICE_SCOPE, setExpanded, requestDelete)
            DeleteMenuItem(R.string.sync_delete_cloud, CLOUD_SCOPE, setExpanded, requestDelete)
            DeleteMenuItem(R.string.sync_delete_all, ALL_DEVICES_SCOPE, setExpanded, requestDelete)
        }
    }
}

@Composable
private fun DeleteMenuItem(
    @StringRes label: Int,
    scope: String,
    setExpanded: (Boolean) -> Unit,
    requestDelete: (String) -> Unit,
) {
    DropdownMenuItem(
        text = { Text(stringResource(label)) },
        onClick = {
            setExpanded(false)
            requestDelete(scope)
        },
    )
}

@Composable
private fun DeleteConfirmationDialog(scope: String, confirm: () -> Unit, dismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = dismiss,
        title = { Text(stringResource(R.string.sync_delete_confirm_title)) },
        text = { Text(stringResource(deleteConfirmation(scope))) },
        confirmButton = {
            TextButton(onClick = confirm) { Text(stringResource(R.string.sync_delete_confirm)) }
        },
        dismissButton = {
            TextButton(onClick = dismiss) { Text(stringResource(R.string.cancel)) }
        },
    )
}

@StringRes
private fun deleteConfirmation(scope: String): Int = when (scope) {
    CURRENT_DEVICE_SCOPE -> R.string.sync_delete_device_explanation
    CLOUD_SCOPE -> R.string.sync_delete_cloud_explanation
    else -> R.string.sync_delete_all_explanation
}

@Composable
private fun documentStateLabel(state: String): String = stringResource(
    when (state) {
        AI_RESULT_KIND -> R.string.library_ai_result_state
        "sync_pending" -> R.string.sync_state_pending
        "synced" -> R.string.sync_state_synced
        "failed" -> R.string.sync_state_failed
        "conflict" -> R.string.sync_state_conflict
        ARCHIVED_STATE -> R.string.library_archived
        DELETED_STATE -> R.string.sync_state_deleted
        else -> R.string.library_local_state
    },
)

private fun formatBytes(bytes: Long): String = when {
    bytes < BYTES_PER_KILOBYTE -> "$bytes B"
    bytes < BYTES_PER_MEGABYTE -> "%.1f KB".format(Locale.ROOT, bytes / BYTES_PER_KILOBYTE.toDouble())
    else -> "%.1f MB".format(Locale.ROOT, bytes / BYTES_PER_MEGABYTE.toDouble())
}

private const val AI_RESULT_KIND = "ai_result"
private const val ARCHIVED_STATE = "archived"
private const val DELETED_STATE = "deleted"
private const val CURRENT_DEVICE_SCOPE = "current_device"
private const val CLOUD_SCOPE = "cloud"
private const val ALL_DEVICES_SCOPE = "all_devices"
private const val HASH_PREVIEW_LENGTH = 23
private const val BYTES_PER_KILOBYTE = 1_024L
private const val BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE
private val SYNCABLE_STATES = setOf("collected", "failed")
