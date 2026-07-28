package com.molan.reader.data.library

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [DocumentEntity::class, DocumentVersionEntity::class, FileObjectEntity::class, SyncMutationEntity::class, ConflictEntity::class, AiResultEntity::class],
    version = 5,
    exportSchema = true,
)
abstract class MolanDatabase : RoomDatabase() {
    abstract fun libraryDao(): LibraryDao

    companion object {
        @Volatile
        private var instance: MolanDatabase? = null

        fun get(context: Context): MolanDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                MolanDatabase::class.java,
                "molan-library.db",
            ).addMigrations(Migration1To2, Migration2To3, Migration3To4, Migration4To5).build().also { instance = it }
        }

        private val Migration1To2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS sync_mutations (
                        id TEXT NOT NULL PRIMARY KEY,
                        documentId TEXT NOT NULL,
                        versionId TEXT NOT NULL,
                        fileObjectId TEXT NOT NULL,
                        uploadMutationId TEXT NOT NULL,
                        documentMutationId TEXT NOT NULL,
                        versionMutationId TEXT NOT NULL,
                        state TEXT NOT NULL,
                        retryCount INTEGER NOT NULL,
                        lastErrorCode TEXT,
                        createdAt TEXT NOT NULL,
                        updatedAt TEXT NOT NULL
                    )
                    """.trimIndent(),
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS index_sync_mutations_documentId ON sync_mutations(documentId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_sync_mutations_state ON sync_mutations(state)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_sync_mutations_createdAt ON sync_mutations(createdAt)")
            }
        }

        private val Migration2To3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("DROP INDEX IF EXISTS index_file_objects_contentHash")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_file_objects_contentHash ON file_objects(contentHash)")
            }
        }

        private val Migration3To4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS conflicts (
                        id TEXT NOT NULL PRIMARY KEY,
                        documentId TEXT NOT NULL,
                        localVersionId TEXT NOT NULL,
                        remoteVersionId TEXT NOT NULL,
                        detectedAt TEXT NOT NULL,
                        resolvedAt TEXT,
                        resolution TEXT
                    )
                    """.trimIndent(),
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS index_conflicts_documentId ON conflicts(documentId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_conflicts_detectedAt ON conflicts(detectedAt)")
            }
        }

        private val Migration4To5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS ai_results (
                        id TEXT NOT NULL PRIMARY KEY,
                        documentId TEXT NOT NULL,
                        sourceVersionId TEXT NOT NULL,
                        sourceArtifactId TEXT,
                        sourceDeviceId TEXT NOT NULL,
                        fileObjectId TEXT NOT NULL,
                        resultType TEXT NOT NULL,
                        format TEXT NOT NULL,
                        generatorName TEXT NOT NULL,
                        generatorVersion TEXT NOT NULL,
                        createdAt TEXT NOT NULL,
                        updatedAt TEXT NOT NULL,
                        deletedAt TEXT,
                        FOREIGN KEY(documentId) REFERENCES documents(id) ON DELETE RESTRICT,
                        FOREIGN KEY(sourceVersionId) REFERENCES document_versions(id) ON DELETE RESTRICT,
                        FOREIGN KEY(fileObjectId) REFERENCES file_objects(id) ON DELETE RESTRICT
                    )
                    """.trimIndent(),
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS index_ai_results_documentId ON ai_results(documentId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_ai_results_sourceVersionId ON ai_results(sourceVersionId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_ai_results_fileObjectId ON ai_results(fileObjectId)")
            }
        }
    }
}
