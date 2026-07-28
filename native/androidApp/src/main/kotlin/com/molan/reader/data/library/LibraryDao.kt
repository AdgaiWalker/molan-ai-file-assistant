package com.molan.reader.data.library

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import androidx.room.OnConflictStrategy
import kotlinx.coroutines.flow.Flow

@Dao
interface LibraryDao {
    @Query("SELECT * FROM documents WHERE sourceKey = :sourceKey AND deletedAt IS NULL LIMIT 1")
    suspend fun documentBySource(sourceKey: String): DocumentEntity?

    @Query("SELECT * FROM documents WHERE id = :id AND deletedAt IS NULL LIMIT 1")
    suspend fun documentById(id: String): DocumentEntity?

    @Query("SELECT * FROM documents WHERE id = :id LIMIT 1")
    suspend fun documentByIdIncludingDeleted(id: String): DocumentEntity?

    @Query("SELECT * FROM document_versions WHERE id = :id LIMIT 1")
    suspend fun versionById(id: String): DocumentVersionEntity?

    @Query("SELECT * FROM file_objects WHERE contentHash = :contentHash AND deletedAt IS NULL LIMIT 1")
    suspend fun fileObjectByHash(contentHash: String): FileObjectEntity?

    @Query("SELECT * FROM file_objects WHERE id = :id LIMIT 1")
    suspend fun fileObjectById(id: String): FileObjectEntity?

    @Insert
    suspend fun insertDocument(document: DocumentEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertDocumentIfMissing(document: DocumentEntity): Long

    @Insert
    suspend fun insertVersion(version: DocumentVersionEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertVersionIfMissing(version: DocumentVersionEntity): Long

    @Insert
    suspend fun insertFileObject(fileObject: FileObjectEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertFileObjectIfMissing(fileObject: FileObjectEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAiResult(result: AiResultEntity)

    @Update
    suspend fun updateDocument(document: DocumentEntity)

    @Query(
        """
        SELECT d.id, 'document' AS kind, d.title, d.originalFormat, d.state, d.updatedAt,
               v.contentHash, v.sizeBytes, NULL AS sourceDocumentId, NULL AS sourceTitle, NULL AS resultType,
               0 AS isStale
        FROM documents d
        JOIN document_versions v ON v.id = d.currentVersionId
        ORDER BY d.updatedAt DESC
        """,
    )
    fun observeDocuments(): Flow<List<LibraryDocumentRow>>

    @Query(
        """
        SELECT r.id, 'ai_result' AS kind,
               CASE r.resultType
                 WHEN 'summary' THEN d.title || ' · AI摘要'
                 WHEN 'structured_json' THEN d.title || ' · AI提取'
                 WHEN 'report' THEN d.title || ' · AI报告'
                 WHEN 'revision' THEN d.title || ' · AI修订'
                 ELSE d.title || ' · AI结果'
               END AS title,
               r.format AS originalFormat,
               'ai_result' AS state,
               r.updatedAt,
               f.contentHash,
               f.sizeBytes,
               sd.id AS sourceDocumentId,
               sd.title AS sourceTitle,
               r.resultType,
               CASE
                 WHEN sd.currentVersionId != r.sourceVersionId OR sd.updatedAt > r.updatedAt THEN 1
                 ELSE 0
               END AS isStale
        FROM ai_results r
        JOIN documents d ON d.id = r.documentId
        JOIN file_objects f ON f.id = r.fileObjectId
        JOIN document_versions sv ON sv.id = r.sourceVersionId
        JOIN documents sd ON sd.id = sv.documentId
        WHERE r.deletedAt IS NULL
        ORDER BY r.updatedAt DESC, r.id DESC
        """,
    )
    fun observeAiResults(): Flow<List<LibraryDocumentRow>>

    @Query(
        """
        SELECT d.title, d.originalFormat, f.localPath
        FROM documents d
        JOIN document_versions v ON v.id = d.currentVersionId
        JOIN file_objects f ON f.id = v.fileObjectId
        WHERE d.id = :documentId AND d.deletedAt IS NULL
        LIMIT 1
        """,
    )
    suspend fun openInfo(documentId: String): CollectedOpenInfo?

    @Query(
        """
        SELECT
          CASE r.resultType
            WHEN 'summary' THEN d.title || ' · AI摘要'
            WHEN 'structured_json' THEN d.title || ' · AI提取'
            WHEN 'report' THEN d.title || ' · AI报告'
            WHEN 'revision' THEN d.title || ' · AI修订'
            ELSE d.title || ' · AI结果'
          END AS title,
          r.format AS originalFormat,
          f.localPath
        FROM ai_results r
        JOIN documents d ON d.id = r.documentId
        JOIN file_objects f ON f.id = r.fileObjectId
        WHERE r.id = :resultId AND r.deletedAt IS NULL
        LIMIT 1
        """,
    )
    suspend fun openAiResultInfo(resultId: String): AiResultOpenInfo?

    @Query("SELECT * FROM ai_results WHERE id = :id AND deletedAt IS NULL LIMIT 1")
    suspend fun aiResultById(id: String): AiResultEntity?

    @Query("UPDATE ai_results SET updatedAt = :updatedAt, deletedAt = :deletedAt WHERE id = :id")
    suspend fun updateAiResultDeleted(id: String, updatedAt: String, deletedAt: String)

    @Query(
        """
        SELECT v.id AS versionId, d.title, v.originalFormat, f.localPath
        FROM document_versions v
        JOIN documents d ON d.id = v.documentId
        JOIN file_objects f ON f.id = v.fileObjectId
        WHERE v.id = :versionId AND v.deletedAt IS NULL
        LIMIT 1
        """,
    )
    suspend fun conflictVersionExport(versionId: String): ConflictVersionExportRow?

    @Query("UPDATE documents SET state = :state, updatedAt = :updatedAt WHERE id = :documentId")
    suspend fun updateState(documentId: String, state: String, updatedAt: String)

    @Query("UPDATE documents SET state = :state, updatedAt = :updatedAt, deletedAt = :deletedAt WHERE id = :documentId")
    suspend fun updateRemoteState(documentId: String, state: String, updatedAt: String, deletedAt: String?)

    @Query("UPDATE document_versions SET fileObjectId = :fileObjectId WHERE id = :versionId")
    suspend fun updateVersionFileObject(versionId: String, fileObjectId: String)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertSyncMutation(mutation: SyncMutationEntity): Long

    @Query("SELECT * FROM sync_mutations WHERE state IN ('pending', 'failed') ORDER BY createdAt LIMIT :limit")
    suspend fun pendingSyncMutations(limit: Int): List<SyncMutationEntity>

    @Query("UPDATE sync_mutations SET state = :state, retryCount = :retryCount, lastErrorCode = :errorCode, updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateSyncMutation(id: String, state: String, retryCount: Int, errorCode: String?, updatedAt: String)

    @Query("DELETE FROM sync_mutations WHERE id = :id")
    suspend fun deleteSyncMutation(id: String)

    @Query(
        """
        SELECT d.id AS documentId, d.sourceDeviceId, d.title, d.originalFormat,
               d.createdAt AS documentCreatedAt, d.updatedAt AS documentUpdatedAt,
               v.id AS versionId, v.parentVersionId, v.contentHash, v.sizeBytes,
               v.fileObjectId, f.localPath,
               v.createdAt AS versionCreatedAt, v.updatedAt AS versionUpdatedAt
        FROM documents d
        JOIN document_versions v ON v.id = d.currentVersionId
        JOIN file_objects f ON f.id = v.fileObjectId
        WHERE d.id = :documentId AND d.deletedAt IS NULL
        LIMIT 1
        """,
    )
    suspend fun syncBundle(documentId: String): SyncBundleRow?

    @Query(
        """
        SELECT d.id AS documentId, d.sourceDeviceId, d.title, d.originalFormat,
               d.createdAt AS documentCreatedAt, d.updatedAt AS documentUpdatedAt,
               v.id AS versionId, v.parentVersionId, v.contentHash, v.sizeBytes,
               v.fileObjectId, f.localPath,
               v.createdAt AS versionCreatedAt, v.updatedAt AS versionUpdatedAt
        FROM documents d
        JOIN document_versions v ON v.id = d.currentVersionId
        JOIN file_objects f ON f.id = v.fileObjectId
        WHERE d.id = :documentId
        LIMIT 1
        """,
    )
    suspend fun syncBundleIncludingDeleted(documentId: String): SyncBundleRow?

    @Query(
        """
        SELECT COUNT(*) FROM documents d
        JOIN document_versions v ON v.id = d.currentVersionId
        JOIN file_objects f ON f.id = v.fileObjectId
        WHERE f.localPath = :localPath AND d.id != :excludingDocumentId AND d.deletedAt IS NULL
        """,
    )
    suspend fun activePathReferenceCount(localPath: String, excludingDocumentId: String): Int

    @Query("SELECT COUNT(*) FROM document_versions WHERE fileObjectId = :fileObjectId AND deletedAt IS NULL")
    suspend fun activeVersionReferenceCount(fileObjectId: String): Int

    @Query("SELECT COUNT(*) FROM ai_results WHERE fileObjectId = :fileObjectId AND id != :excludingResultId AND deletedAt IS NULL")
    suspend fun activeAiResultReferenceCount(fileObjectId: String, excludingResultId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertConflict(conflict: ConflictEntity)

    @Query("SELECT * FROM conflicts WHERE resolvedAt IS NULL ORDER BY detectedAt DESC")
    fun observeConflicts(): Flow<List<ConflictEntity>>

    @Query("DELETE FROM conflicts WHERE id = :id")
    suspend fun deleteConflict(id: String)

    @Query("DELETE FROM conflicts")
    suspend fun clearConflicts()
}
