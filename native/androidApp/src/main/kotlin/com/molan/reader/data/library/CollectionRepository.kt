package com.molan.reader.data.library

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import androidx.room.withTransaction
import com.molan.reader.document.CollectionResult
import com.molan.reader.document.CollectionPlan
import com.molan.reader.document.ConflictVersionExport
import com.molan.reader.document.decideCollectionPlan
import com.molan.reader.document.DocumentOpenRequest
import com.molan.reader.document.LibraryDocument
import com.molan.reader.document.LibraryConflict
import com.molan.reader.document.OpenDocument
import com.molan.shared.SharedContractEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

class CollectionRepository(
    private val context: Context,
    private val contentResolver: ContentResolver,
    private val database: MolanDatabase,
    private val contracts: SharedContractEngine = SharedContractEngine(),
) {
    private val dao = database.libraryDao()
    private val objectsDirectory = File(context.filesDir, "objects")
    private val random = SecureRandom()
    private val sourceDeviceId by lazy { deviceId() }

    fun observeDocuments(): Flow<List<LibraryDocument>> = combine(
        dao.observeDocuments(),
        dao.observeAiResults(),
    ) { documentRows, resultRows ->
        val hiddenDocumentIds = documentRows
            .filter { it.state == "ai_result_ready" }
            .map { it.id }
            .toSet()
        (documentRows.filterNot { it.id in hiddenDocumentIds } + resultRows)
            .sortedByDescending { it.updatedAt }
            .map { row ->
                LibraryDocument(
                    id = row.id,
                    kind = row.kind,
                    title = row.title,
                    format = row.originalFormat,
                    state = row.state,
                    updatedAt = row.updatedAt,
                    contentHash = row.contentHash,
                    sizeBytes = row.sizeBytes,
                    sourceDocumentId = row.sourceDocumentId,
                    sourceTitle = row.sourceTitle,
                    resultType = row.resultType,
                    isStale = row.isStale,
                )
            }
    }

    fun observeConflicts(): Flow<List<LibraryConflict>> = dao.observeConflicts().map { rows ->
        rows.map { row ->
            LibraryConflict(row.id, row.documentId, row.localVersionId, row.remoteVersionId, row.detectedAt)
        }
    }

    suspend fun collect(document: OpenDocument, unnamedTitle: String): CollectionResult =
        withContext(Dispatchers.IO) {
            val bytes = contentResolver.openInputStream(Uri.parse(document.requestKey))?.use { input ->
                val output = ByteArrayOutputStream()
                val buffer = ByteArray(BufferSize)
                var total = 0
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    total += count
                    if (total > MaxCollectedBytes) throw IOException("file exceeds local collection limit")
                    output.write(buffer, 0, count)
                }
                output.toByteArray()
            } ?: throw IOException("source unavailable")
            val contentHash = "sha256:${bytes.sha256()}"
            val now = timestamp()
            val existingFileObject = dao.fileObjectByHash(contentHash)
            val fileObject = existingFileObject ?: FileObjectEntity(
                id = newId("obj_"),
                role = "original",
                contentHash = contentHash,
                sizeBytes = bytes.size.toLong(),
                localPath = File(objectsDirectory, "${contentHash.removePrefix("sha256:")}.bin").absolutePath,
                createdAt = now,
                updatedAt = now,
                deletedAt = null,
            )
            val createdFile = existingFileObject == null
            if (createdFile) writeObjectAtomically(File(fileObject.localPath), bytes)

            runCatching {
                database.withTransaction {
                    if (existingFileObject == null) dao.insertFileObject(fileObject)
                    val existingDocument = dao.documentBySource(document.requestKey)
                    val currentVersion = existingDocument?.currentVersionId?.let { dao.versionById(it) }
                    val plan = decideCollectionPlan(
                        documentExists = existingDocument != null,
                        currentContentHash = currentVersion?.contentHash,
                        incomingContentHash = contentHash,
                    )
                    if (plan == CollectionPlan.Duplicate) {
                        return@withTransaction CollectionResult.Duplicate(
                            requireNotNull(existingDocument).id,
                        )
                    }

                    val documentId = existingDocument?.id ?: newId("doc_")
                    val versionId = newId("ver_")
                    val version = DocumentVersionEntity(
                        id = versionId,
                        documentId = documentId,
                        sourceDeviceId = sourceDeviceId,
                        originalFormat = document.format,
                        contentHash = contentHash,
                        sizeBytes = bytes.size.toLong(),
                        fileObjectId = fileObject.id,
                        parentVersionId = currentVersion?.id,
                        createdAt = now,
                        updatedAt = now,
                        deletedAt = null,
                    )
                    if (existingDocument == null) {
                        dao.insertDocument(
                            DocumentEntity(
                                id = documentId,
                                sourceDeviceId = sourceDeviceId,
                                sourceKey = document.requestKey,
                                title = document.displayName ?: unnamedTitle,
                                originalFormat = document.format,
                                currentVersionId = null,
                                state = "collected",
                                createdAt = now,
                                updatedAt = now,
                                deletedAt = null,
                            ),
                        )
                    }
                    dao.insertVersion(version)
                    val updatedDocument = (existingDocument ?: dao.documentBySource(document.requestKey)!!).copy(
                        title = document.displayName ?: unnamedTitle,
                        originalFormat = document.format,
                        currentVersionId = versionId,
                        state = "collected",
                        updatedAt = now,
                    )
                    dao.updateDocument(updatedDocument)
                    if (plan == CollectionPlan.NewDocument) CollectionResult.Added(documentId)
                    else CollectionResult.NewVersion(documentId)
                }
            }.getOrElse { error ->
                if (createdFile && dao.fileObjectByHash(contentHash) == null) File(fileObject.localPath).delete()
                throw error
            }
        }

    suspend fun openRequest(documentId: String): DocumentOpenRequest? = withContext(Dispatchers.IO) {
        dao.openInfo(documentId)?.let { info ->
            val file = File(info.localPath)
            if (!file.exists()) null else DocumentOpenRequest(Uri.fromFile(file), info.title)
        } ?: dao.openAiResultInfo(documentId)?.let { info ->
            val file = File(info.localPath)
            if (!file.exists()) null else DocumentOpenRequest(Uri.fromFile(file), info.title)
        }
    }

    suspend fun conflictVersionExport(versionId: String): ConflictVersionExport? =
        withContext(Dispatchers.IO) {
            dao.conflictVersionExport(versionId)?.let { row ->
                val file = File(row.localPath)
                if (!file.isFile) return@withContext null
                ConflictVersionExport(row.versionId, row.title, row.originalFormat, row.localPath)
            }
        }

    suspend fun setArchived(documentId: String, archived: Boolean) {
        dao.updateState(documentId, if (archived) "archived" else "collected", timestamp())
    }

    suspend fun queueSync(documentId: String): Boolean = withContext(Dispatchers.IO) {
        val bundle = dao.syncBundle(documentId) ?: return@withContext false
        val now = timestamp()
        val mutation = SyncMutationEntity(
            id = newId("mut_"),
            documentId = documentId,
            versionId = bundle.versionId,
            fileObjectId = bundle.fileObjectId,
            uploadMutationId = newId("mut_"),
            documentMutationId = newId("mut_"),
            versionMutationId = newId("mut_"),
            state = "pending",
            retryCount = 0,
            lastErrorCode = null,
            createdAt = now,
            updatedAt = now,
        )
        val inserted = dao.insertSyncMutation(mutation) != -1L
        if (inserted) dao.updateState(documentId, "sync_pending", now)
        inserted
    }

    fun localDeviceId(): String = sourceDeviceId

    suspend fun documentVersionId(documentId: String): String? =
        dao.documentByIdIncludingDeleted(documentId)?.currentVersionId

    suspend fun deleteFromDevice(documentId: String): Boolean = withContext(Dispatchers.IO) {
        val bundle = dao.syncBundleIncludingDeleted(documentId)
        if (bundle != null) {
            val now = timestamp()
            dao.updateRemoteState(documentId, "deleted", now, now)
            if (dao.activePathReferenceCount(bundle.localPath, documentId) == 0) File(bundle.localPath).delete()
            return@withContext true
        }

        val result = dao.aiResultById(documentId) ?: return@withContext false
        val fileObject = dao.fileObjectById(result.fileObjectId) ?: return@withContext false
        val now = timestamp()
        dao.updateAiResultDeleted(result.id, now, now)
        if (
            dao.activeVersionReferenceCount(result.fileObjectId) == 0 &&
            dao.activeAiResultReferenceCount(result.fileObjectId, result.id) == 0
        ) {
            File(fileObject.localPath).delete()
        }
        true
    }

    suspend fun restoreBundle(documentId: String): SyncBundleRow? = dao.syncBundleIncludingDeleted(documentId)

    suspend fun restoreOnDevice(documentId: String) {
        dao.updateRemoteState(documentId, "synced", timestamp(), null)
    }

    suspend fun removeConflict(id: String) {
        dao.deleteConflict(id)
    }

    fun newMutationId(): String = newId("mut_")

    private fun writeObjectAtomically(target: File, bytes: ByteArray) {
        check(objectsDirectory.exists() || objectsDirectory.mkdirs()) { "objects directory unavailable" }
        if (target.exists()) return
        val temporary = File(objectsDirectory, "${target.name}.tmp-${System.nanoTime()}")
        temporary.outputStream().use { output ->
            output.write(bytes)
            output.flush()
            output.fd.sync()
        }
        check(temporary.renameTo(target)) { "object replace failed" }
    }

    private fun deviceId(): String {
        val preferences = context.getSharedPreferences(IdentityPreferences, Context.MODE_PRIVATE)
        preferences.getString(DeviceIdKey, null)?.let { return it }
        val id = newId("dev_")
        check(preferences.edit().putString(DeviceIdKey, id).commit()) { "device identity unavailable" }
        return id
    }

    private fun newId(prefix: String): String {
        val entropy = ByteArray(10).also(random::nextBytes).joinToString("") { "%02x".format(it) }
        return prefix + contracts.entityId(System.currentTimeMillis(), entropy)
    }

    private fun ByteArray.sha256(): String =
        MessageDigest.getInstance("SHA-256").digest(this).joinToString("") { "%02x".format(it) }

    private fun timestamp(): String = TimestampFormatter.format(Instant.now())

    private companion object {
        const val BufferSize = 16 * 1024
        const val MaxCollectedBytes = 16 * 1024 * 1024
        const val IdentityPreferences = "molan.identity"
        const val DeviceIdKey = "device_id"
        val TimestampFormatter: DateTimeFormatter =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)
    }
}
