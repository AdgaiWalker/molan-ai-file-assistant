package com.molan.reader.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.molan.reader.data.library.MolanDatabase
import com.molan.reader.data.library.DocumentEntity
import com.molan.reader.data.library.DocumentVersionEntity
import com.molan.reader.data.library.FileObjectEntity
import com.molan.reader.data.library.AiResultEntity
import com.molan.reader.data.library.LibraryDao
import com.molan.reader.data.library.ConflictEntity
import com.molan.reader.data.library.SyncBundleRow
import com.molan.reader.data.library.SyncMutationEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

class SyncWorker(
    appContext: Context,
    parameters: WorkerParameters,
) : CoroutineWorker(appContext, parameters) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val credentialStore = SyncCredentialStore(applicationContext)
        var credentials = credentialStore.load() ?: return@withContext Result.success()
        val database = MolanDatabase.get(applicationContext)
        val dao = database.libraryDao()
        run {
            val mutations = dao.pendingSyncMutations(BatchSize)
            for (mutation in mutations) {
                val bundle = dao.syncBundle(mutation.documentId)
                if (bundle == null) {
                    dao.updateSyncMutation(mutation.id, "failed", mutation.retryCount, "E_SOURCE_MISSING", timestamp())
                    continue
                }
                dao.updateSyncMutation(mutation.id, "running", mutation.retryCount, null, timestamp())
                try {
                    credentials = syncOne(credentials, mutation, bundle, credentialStore, dao)
                    dao.deleteSyncMutation(mutation.id)
                    dao.updateState(mutation.documentId, "synced", timestamp())
                } catch (error: SyncApiException) {
                    val retry = error.status >= 500 || error.status == 429
                    dao.updateSyncMutation(
                        mutation.id,
                        "failed",
                        mutation.retryCount + 1,
                        error.errorCode,
                        timestamp(),
                    )
                    if (error.status == 401 || error.status == 403) return@withContext Result.failure()
                    if (retry) return@withContext Result.retry()
                } catch (_: IOException) {
                    dao.updateSyncMutation(mutation.id, "failed", mutation.retryCount + 1, "E_SYNC_NETWORK", timestamp())
                    return@withContext Result.retry()
                }
            }
            var hasMore = true
            while (hasMore) {
                var pageHasMore = false
                credentials = withFreshSession(credentials, credentialStore) { client, active ->
                    val response = client.pull(active)
                    applyPulledEvents(response.getJSONArray("events"), dao, client, active)
                    pageHasMore = response.getBoolean("hasMore")
                    active.copy(cursor = response.getString("cursor"))
                }
                credentialStore.save(credentials)
                hasMore = pageHasMore
            }
            credentials = withFreshSession(credentials, credentialStore) { client, active ->
                applyConflicts(client.conflicts(active).getJSONArray("conflicts"), dao)
                active
            }
            credentialStore.save(credentials)
            if (dao.pendingSyncMutations(1).isNotEmpty()) Result.retry() else Result.success()
        }
    }

    private suspend fun syncOne(
        credentials: SyncCredentials,
        mutation: SyncMutationEntity,
        bundle: SyncBundleRow,
        store: SyncCredentialStore,
        dao: LibraryDao,
    ): SyncCredentials = withFreshSession(credentials, store) { client, active ->
        val upload = client.createUpload(
            active,
            JSONObject()
                .put("clientMutationId", mutation.uploadMutationId)
                .put("fileObjectId", mutation.fileObjectId)
                .put("role", "original")
                .put("format", bundle.originalFormat)
                .put("contentHash", bundle.contentHash)
                .put("sizeBytes", bundle.sizeBytes)
                .put("mediaType", mediaType(bundle.originalFormat)),
        )
        var remoteFileObjectId = upload.optString("fileObjectId").ifBlank { bundle.fileObjectId }
        if (!upload.getBoolean("alreadyComplete")) {
            val uploadId = upload.getString("uploadId")
            val parts = JSONArray()
            File(bundle.localPath).inputStream().use { input ->
                var partNumber = 1
                val buffer = ByteArray(UploadPartBytes)
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    val response = client.uploadPart(active, uploadId, partNumber, buffer.copyOf(count))
                    parts.put(
                        JSONObject()
                            .put("partNumber", partNumber)
                            .put("etag", response.getString("etag")),
                    )
                    partNumber += 1
                }
            }
            val completed = client.completeUpload(active, uploadId, parts)
            remoteFileObjectId = completed.getJSONObject("fileObject").getString("id")
        }
        if (remoteFileObjectId != bundle.fileObjectId) {
            val localObject = requireNotNull(dao.fileObjectById(bundle.fileObjectId))
            dao.insertFileObjectIfMissing(localObject.copy(id = remoteFileObjectId))
            dao.updateVersionFileObject(bundle.versionId, remoteFileObjectId)
        }
        val documentPayload = JSONObject()
            .put("id", bundle.documentId)
            .put("sourceDeviceId", active.deviceId)
            .put("title", bundle.title)
            .put("originalFormat", bundle.originalFormat)
            .put("currentVersionId", JSONObject.NULL)
            .put("createdAt", bundle.documentCreatedAt)
            .put("updatedAt", bundle.documentUpdatedAt)
            .put("deletedAt", JSONObject.NULL)
        val versionPayload = JSONObject()
            .put("id", bundle.versionId)
            .put("documentId", bundle.documentId)
            .put("sourceDeviceId", active.deviceId)
            .put("originalFormat", bundle.originalFormat)
            .put("contentHash", bundle.contentHash)
            .put("sizeBytes", bundle.sizeBytes)
            .put("fileObjectId", remoteFileObjectId)
            .put("parentVersionId", bundle.parentVersionId ?: JSONObject.NULL)
            .put("createdAt", bundle.versionCreatedAt)
            .put("updatedAt", bundle.versionUpdatedAt)
            .put("deletedAt", JSONObject.NULL)
        val mutations = JSONArray()
            .put(syncMutation(mutation.documentMutationId, active.deviceId, bundle, null, null, documentPayload))
            .put(syncMutation(
                mutation.versionMutationId,
                active.deviceId,
                bundle,
                bundle.versionId,
                bundle.parentVersionId,
                versionPayload,
            ))
        val pushed = client.push(active, mutations)
        if (!pushed.getBoolean("ok")) {
            val results = pushed.getJSONArray("results")
            for (index in 0 until results.length()) {
                val result = results.getJSONObject(index)
                if (!result.getBoolean("ok")) {
                    val error = result.getJSONObject("error")
                    throw SyncApiException(409, error.getString("errorCode"), error.getString("error"))
                }
            }
        }
        active
    }

    private suspend fun <T> withFreshSession(
        credentials: SyncCredentials,
        store: SyncCredentialStore,
        action: suspend (SyncApiClient, SyncCredentials) -> T,
    ): T {
        val client = SyncApiClient(credentials.serverUrl)
        return try {
            action(client, credentials)
        } catch (error: SyncApiException) {
            if (error.status != 401 || error.errorCode == "E_DEVICE_REVOKED") throw error
            val refreshed = client.refresh(credentials)
            store.save(refreshed)
            action(client, refreshed)
        }
    }

    private suspend fun applyPulledEvents(
        events: JSONArray,
        dao: LibraryDao,
        client: SyncApiClient,
        credentials: SyncCredentials,
    ) {
        for (index in 0 until events.length()) {
            val event = events.getJSONObject(index)
            val documentId = event.getString("documentId")
            val operation = event.getString("operation")
            when (operation) {
                "upsert" -> {
                    val payload = event.getJSONObject("payload")
                    when {
                        payload.getString("id").startsWith("doc_") -> applyDocumentPayload(payload, event, dao)
                        payload.getString("id").startsWith("ver_") -> applyVersionPayload(payload, event, dao, client, credentials)
                        payload.getString("id").startsWith("air_") -> applyAiResultPayload(payload, dao, client, credentials)
                    }
                }
                "delete" -> {
                    val scope = event.getJSONObject("payload").optString("scope", "all_devices")
                    val deletedAt = event.getJSONObject("tombstone").getString("deletedAt")
                    if (scope == "cloud") dao.updateRemoteState(documentId, "collected", deletedAt, null)
                    else {
                        val bundle = dao.syncBundleIncludingDeleted(documentId)
                        dao.updateRemoteState(documentId, "deleted", deletedAt, deletedAt)
                        if (bundle != null && dao.activePathReferenceCount(bundle.localPath, documentId) == 0) {
                            File(bundle.localPath).delete()
                        }
                    }
                }
                "archive" -> dao.updateRemoteState(documentId, "archived", event.getString("updatedAt"), null)
                "restore" -> {
                    dao.updateRemoteState(documentId, "synced", event.getString("updatedAt"), null)
                    dao.syncBundle(documentId)?.let { bundle ->
                        client.downloadFile(
                            credentials,
                            bundle.fileObjectId,
                            File(bundle.localPath),
                            bundle.contentHash,
                            bundle.sizeBytes,
                        )
                    }
                }
            }
        }
    }

    private suspend fun applyConflicts(conflicts: JSONArray, dao: LibraryDao) {
        dao.clearConflicts()
        for (index in 0 until conflicts.length()) {
            val conflict = conflicts.getJSONObject(index)
            dao.upsertConflict(
                ConflictEntity(
                    id = conflict.getString("id"),
                    documentId = conflict.getString("documentId"),
                    localVersionId = conflict.getString("localVersionId"),
                    remoteVersionId = conflict.getString("remoteVersionId"),
                    detectedAt = conflict.getString("detectedAt"),
                    resolvedAt = conflict.nullableString("resolvedAt"),
                    resolution = conflict.nullableString("resolution"),
                ),
            )
        }
    }

    private suspend fun applyDocumentPayload(payload: JSONObject, event: JSONObject, dao: LibraryDao) {
        val id = payload.getString("id")
        val existing = dao.documentByIdIncludingDeleted(id)
        val state = if (event.getString("phase") == "conflict") "conflict" else payload.optString("state", "synced")
        val document = DocumentEntity(
            id = id,
            sourceDeviceId = payload.getString("sourceDeviceId"),
            sourceKey = existing?.sourceKey ?: "sync:$id",
            title = payload.getString("title"),
            originalFormat = payload.getString("originalFormat"),
            currentVersionId = existing?.currentVersionId ?: payload.nullableString("currentVersionId"),
            state = state,
            createdAt = payload.getString("createdAt"),
            updatedAt = payload.getString("updatedAt"),
            deletedAt = payload.nullableString("deletedAt"),
        )
        if (existing == null) dao.insertDocumentIfMissing(document) else dao.updateDocument(document)
    }

    private suspend fun applyAiResultPayload(
        payload: JSONObject,
        dao: LibraryDao,
        client: SyncApiClient,
        credentials: SyncCredentials,
    ) {
        val fileObjectId = payload.getString("fileObjectId")
        val contentHash = payload.getString("contentHash")
        val sizeBytes = payload.getLong("sizeBytes")
        val target = File(applicationContext.filesDir, "objects/${contentHash.removePrefix("sha256:")}.bin")
        client.downloadFile(credentials, fileObjectId, target, contentHash, sizeBytes)
        val updatedAt = payload.getString("updatedAt")
        dao.insertFileObjectIfMissing(
            FileObjectEntity(
                id = fileObjectId,
                role = "ai_result",
                contentHash = contentHash,
                sizeBytes = sizeBytes,
                localPath = target.absolutePath,
                createdAt = payload.getString("createdAt"),
                updatedAt = updatedAt,
                deletedAt = payload.nullableString("deletedAt"),
            ),
        )
        dao.upsertAiResult(
            AiResultEntity(
                id = payload.getString("id"),
                documentId = payload.getString("documentId"),
                sourceVersionId = payload.getString("sourceVersionId"),
                sourceArtifactId = payload.nullableString("sourceArtifactId"),
                sourceDeviceId = payload.getString("sourceDeviceId"),
                fileObjectId = fileObjectId,
                resultType = payload.getString("resultType"),
                format = payload.getString("format"),
                generatorName = payload.getString("generatorName"),
                generatorVersion = payload.getString("generatorVersion"),
                createdAt = payload.getString("createdAt"),
                updatedAt = updatedAt,
                deletedAt = payload.nullableString("deletedAt"),
            ),
        )
    }

    private suspend fun applyVersionPayload(
        payload: JSONObject,
        event: JSONObject,
        dao: LibraryDao,
        client: SyncApiClient,
        credentials: SyncCredentials,
    ) {
        val documentId = payload.getString("documentId")
        val fileObjectId = payload.getString("fileObjectId")
        val contentHash = payload.getString("contentHash")
        val sizeBytes = payload.getLong("sizeBytes")
        val target = File(applicationContext.filesDir, "objects/${contentHash.removePrefix("sha256:")}.bin")
        client.downloadFile(credentials, fileObjectId, target, contentHash, sizeBytes)
        val now = event.getString("updatedAt")
        dao.insertFileObjectIfMissing(
            FileObjectEntity(
                id = fileObjectId,
                role = "original",
                contentHash = contentHash,
                sizeBytes = sizeBytes,
                localPath = target.absolutePath,
                createdAt = payload.getString("createdAt"),
                updatedAt = now,
                deletedAt = payload.nullableString("deletedAt"),
            ),
        )
        var document = dao.documentByIdIncludingDeleted(documentId)
        if (document == null) {
            val fallback = DocumentEntity(
                id = documentId,
                sourceDeviceId = payload.getString("sourceDeviceId"),
                sourceKey = "sync:$documentId",
                title = documentId,
                originalFormat = payload.getString("originalFormat"),
                currentVersionId = null,
                state = "synced",
                createdAt = payload.getString("createdAt"),
                updatedAt = now,
                deletedAt = null,
            )
            dao.insertDocumentIfMissing(fallback)
            document = fallback
        }
        val versionId = payload.getString("id")
        dao.insertVersionIfMissing(
            DocumentVersionEntity(
                id = versionId,
                documentId = documentId,
                sourceDeviceId = payload.getString("sourceDeviceId"),
                originalFormat = payload.getString("originalFormat"),
                contentHash = contentHash,
                sizeBytes = sizeBytes,
                fileObjectId = fileObjectId,
                parentVersionId = payload.nullableString("parentVersionId"),
                createdAt = payload.getString("createdAt"),
                updatedAt = now,
                deletedAt = payload.nullableString("deletedAt"),
            ),
        )
        if (dao.versionById(versionId)?.fileObjectId != fileObjectId) {
            dao.updateVersionFileObject(versionId, fileObjectId)
        }
        val conflict = event.getString("phase") == "conflict"
        dao.updateDocument(
            requireNotNull(document).copy(
                currentVersionId = if (conflict) document.currentVersionId else versionId,
                state = if (conflict) "conflict" else "synced",
                updatedAt = now,
                deletedAt = null,
            ),
        )
    }

    private fun syncMutation(
        id: String,
        deviceId: String,
        bundle: SyncBundleRow,
        versionId: String?,
        baseVersionId: String?,
        payload: JSONObject,
    ): JSONObject = JSONObject()
        .put("clientMutationId", id)
        .put("deviceId", deviceId)
        .put("documentId", bundle.documentId)
        .put("versionId", versionId ?: JSONObject.NULL)
        .put("baseVersionId", baseVersionId ?: JSONObject.NULL)
        .put("operation", "upsert")
        .put("retryCount", 0)
        .put("payload", payload)

    private fun mediaType(format: String): String = when (format) {
        "json" -> "application/json"
        "markdown" -> "text/markdown"
        else -> "text/plain"
    }

    private fun timestamp(): String = TimestampFormatter.format(Instant.now())

    private companion object {
        const val BatchSize = 10
        const val UploadPartBytes = 4 * 1024 * 1024
        val TimestampFormatter: DateTimeFormatter =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)
    }
}

private fun JSONObject.nullableString(key: String): String? = if (isNull(key)) null else getString(key)
