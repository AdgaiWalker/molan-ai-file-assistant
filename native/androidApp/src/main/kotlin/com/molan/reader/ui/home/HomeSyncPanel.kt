package com.molan.reader.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.molan.reader.R
import com.molan.reader.document.SyncFailure
import com.molan.reader.document.SyncNotice
import com.molan.reader.document.SyncUiState

@Composable
internal fun SyncPanel(
    state: SyncUiState,
    login: (String, String, String) -> Unit,
    logout: () -> Unit,
    syncNow: () -> Unit,
) {
    var serverUrl by rememberSaveable { mutableStateOf(DEFAULT_SYNC_SERVER_URL) }
    var phone by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(stringResource(R.string.sync_title), style = MaterialTheme.typography.titleMedium)
            when (state) {
                SyncUiState.LoggedOut, is SyncUiState.Failed -> LoggedOutSyncContent(
                    state = state,
                    serverUrl = serverUrl,
                    phone = phone,
                    code = code,
                    setServerUrl = { serverUrl = it },
                    setPhone = { phone = it },
                    setCode = { code = it },
                    login = login,
                )
                SyncUiState.LoggingIn -> {
                    CircularProgressIndicator()
                    Text(stringResource(R.string.sync_logging_in))
                }
                is SyncUiState.LoggedIn -> LoggedInSyncContent(state, syncNow, logout)
            }
        }
    }
}

@Composable
private fun LoggedOutSyncContent(
    state: SyncUiState,
    serverUrl: String,
    phone: String,
    code: String,
    setServerUrl: (String) -> Unit,
    setPhone: (String) -> Unit,
    setCode: (String) -> Unit,
    login: (String, String, String) -> Unit,
) {
    Text(stringResource(R.string.sync_login_explanation), style = MaterialTheme.typography.bodySmall)
    OutlinedTextField(
        value = serverUrl,
        onValueChange = setServerUrl,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(stringResource(R.string.sync_server_url)) },
        singleLine = true,
    )
    OutlinedTextField(
        value = phone,
        onValueChange = setPhone,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(stringResource(R.string.sync_phone)) },
        singleLine = true,
    )
    OutlinedTextField(
        value = code,
        onValueChange = setCode,
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

@Composable
private fun LoggedInSyncContent(state: SyncUiState.LoggedIn, syncNow: () -> Unit, logout: () -> Unit) {
    Text(stringResource(R.string.sync_logged_in, state.deviceId.take(DEVICE_ID_PREVIEW_LENGTH)))
    state.notice?.let { Text(stringResource(it.messageResource())) }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = syncNow) { Text(stringResource(R.string.sync_now)) }
        OutlinedButton(onClick = logout) { Text(stringResource(R.string.sync_logout)) }
    }
}

private fun SyncNotice.messageResource(): Int = when (this) {
    SyncNotice.QueueAdded -> R.string.sync_queue_added
    SyncNotice.Syncing -> R.string.sync_started
}

private fun SyncFailure.messageResource(): Int = when (this) {
    SyncFailure.LoginFailed -> R.string.sync_login_failed
    SyncFailure.LoginRequired -> R.string.sync_login_required
    SyncFailure.QueueFailed -> R.string.sync_queue_failed
}

private const val DEFAULT_SYNC_SERVER_URL = "http://10.0.2.2:43120"
private const val DEVICE_ID_PREVIEW_LENGTH = 18
