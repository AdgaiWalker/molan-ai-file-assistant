package com.molan.reader.data.library

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "documents",
    indices = [Index(value = ["sourceKey"], unique = true)],
)
data class DocumentEntity(
    @PrimaryKey val id: String,
    val sourceDeviceId: String,
    val sourceKey: String,
    val title: String,
    val originalFormat: String,
    val currentVersionId: String?,
    val state: String,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String?,
)

@Entity(
    tableName = "file_objects",
    indices = [Index(value = ["contentHash"])],
)
data class FileObjectEntity(
    @PrimaryKey val id: String,
    val role: String,
    val contentHash: String,
    val sizeBytes: Long,
    val localPath: String,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String?,
)

@Entity(
    tableName = "document_versions",
    foreignKeys = [
        ForeignKey(
            entity = DocumentEntity::class,
            parentColumns = ["id"],
            childColumns = ["documentId"],
            onDelete = ForeignKey.RESTRICT,
        ),
        ForeignKey(
            entity = FileObjectEntity::class,
            parentColumns = ["id"],
            childColumns = ["fileObjectId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
    indices = [Index("documentId"), Index("fileObjectId"), Index("contentHash")],
)
data class DocumentVersionEntity(
    @PrimaryKey val id: String,
    val documentId: String,
    val sourceDeviceId: String,
    val originalFormat: String,
    val contentHash: String,
    val sizeBytes: Long,
    val fileObjectId: String,
    val parentVersionId: String?,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String?,
)

data class LibraryDocumentRow(
    val id: String,
    val kind: String,
    val title: String,
    val originalFormat: String,
    val state: String,
    val updatedAt: String,
    val contentHash: String,
    val sizeBytes: Long,
    val sourceDocumentId: String?,
    val sourceTitle: String?,
    val resultType: String?,
    val isStale: Boolean,
)

data class CollectedOpenInfo(
    val title: String,
    val originalFormat: String,
    val localPath: String,
)

data class ConflictVersionExportRow(
    val versionId: String,
    val title: String,
    val originalFormat: String,
    val localPath: String,
)

data class AiResultOpenInfo(
    val title: String,
    val originalFormat: String,
    val localPath: String,
)

@Entity(
    tableName = "ai_results",
    foreignKeys = [
        ForeignKey(
            entity = DocumentEntity::class,
            parentColumns = ["id"],
            childColumns = ["documentId"],
            onDelete = ForeignKey.RESTRICT,
        ),
        ForeignKey(
            entity = DocumentVersionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sourceVersionId"],
            onDelete = ForeignKey.RESTRICT,
        ),
        ForeignKey(
            entity = FileObjectEntity::class,
            parentColumns = ["id"],
            childColumns = ["fileObjectId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
    indices = [Index("documentId"), Index("sourceVersionId"), Index("fileObjectId")],
)
data class AiResultEntity(
    @PrimaryKey val id: String,
    val documentId: String,
    val sourceVersionId: String,
    val sourceArtifactId: String?,
    val sourceDeviceId: String,
    val fileObjectId: String,
    val resultType: String,
    val format: String,
    val generatorName: String,
    val generatorVersion: String,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String?,
)

@Entity(
    tableName = "sync_mutations",
    indices = [Index("documentId"), Index("state"), Index("createdAt")],
)
data class SyncMutationEntity(
    @PrimaryKey val id: String,
    val documentId: String,
    val versionId: String,
    val fileObjectId: String,
    val uploadMutationId: String,
    val documentMutationId: String,
    val versionMutationId: String,
    val state: String,
    val retryCount: Int,
    val lastErrorCode: String?,
    val createdAt: String,
    val updatedAt: String,
)

data class SyncBundleRow(
    val documentId: String,
    val sourceDeviceId: String,
    val title: String,
    val originalFormat: String,
    val documentCreatedAt: String,
    val documentUpdatedAt: String,
    val versionId: String,
    val parentVersionId: String?,
    val contentHash: String,
    val sizeBytes: Long,
    val fileObjectId: String,
    val localPath: String,
    val versionCreatedAt: String,
    val versionUpdatedAt: String,
)

@Entity(
    tableName = "conflicts",
    indices = [Index("documentId"), Index("detectedAt")],
)
data class ConflictEntity(
    @PrimaryKey val id: String,
    val documentId: String,
    val localVersionId: String,
    val remoteVersionId: String,
    val detectedAt: String,
    val resolvedAt: String?,
    val resolution: String?,
)
