package com.molan.reader.data.sync

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class SyncApiClient(private val serverUrl: String) {
    fun login(phoneNumber: String, code: String, installationId: String): SyncCredentials {
        val challenge = jsonRequest(
            path = "/v1/auth/code/request",
            method = "POST",
            body = JSONObject().put("phoneNumber", phoneNumber),
        ).getString("challengeId")
        val response = jsonRequest(
            path = "/v1/auth/code/verify",
            method = "POST",
            body = JSONObject()
                .put("challengeId", challenge)
                .put("code", code)
                .put(
                    "device",
                    JSONObject()
                        .put("installationId", installationId)
                        .put("name", android.os.Build.MODEL)
                        .put("type", "phone")
                        .put("platform", "android")
                        .put("appVersion", "0.1.0-dev"),
                ),
        )
        return credentials(response)
    }

    fun refresh(credentials: SyncCredentials): SyncCredentials {
        val response = jsonRequest(
            path = "/v1/auth/refresh",
            method = "POST",
            body = JSONObject().put("refreshToken", credentials.refreshToken),
        )
        return credentials(response).copy(serverUrl = credentials.serverUrl, cursor = credentials.cursor)
    }

    fun createUpload(credentials: SyncCredentials, body: JSONObject): JSONObject =
        jsonRequest("/v1/files/uploads", "POST", body, credentials.accessToken)

    fun uploadPart(credentials: SyncCredentials, uploadId: String, partNumber: Int, bytes: ByteArray): JSONObject =
        binaryRequest(
            "/v1/files/uploads/$uploadId/parts/$partNumber",
            "PUT",
            bytes,
            credentials.accessToken,
        )

    fun completeUpload(
        credentials: SyncCredentials,
        uploadId: String,
        parts: JSONArray,
    ): JSONObject = jsonRequest(
        "/v1/files/uploads/$uploadId/complete",
        "POST",
        JSONObject().put("parts", parts),
        credentials.accessToken,
    )

    fun push(credentials: SyncCredentials, mutations: JSONArray): JSONObject = jsonRequest(
        "/v1/sync/push",
        "POST",
        JSONObject().put("deviceId", credentials.deviceId).put("mutations", mutations),
        credentials.accessToken,
    )

    fun pull(credentials: SyncCredentials): JSONObject = jsonRequest(
        "/v1/sync/pull",
        "POST",
        JSONObject()
            .put("deviceId", credentials.deviceId)
            .put("cursor", credentials.cursor ?: JSONObject.NULL)
            .put("limit", 100),
        credentials.accessToken,
    )

    fun deleteDocument(
        credentials: SyncCredentials,
        documentId: String,
        baseVersionId: String?,
        scope: String,
        clientMutationId: String,
    ): JSONObject = jsonRequest(
        "/v1/documents/$documentId",
        "DELETE",
        JSONObject()
            .put("clientMutationId", clientMutationId)
            .put("deviceId", credentials.deviceId)
            .put("baseVersionId", baseVersionId ?: JSONObject.NULL)
            .put("scope", scope),
        credentials.accessToken,
    )

    fun restoreDocument(
        credentials: SyncCredentials,
        documentId: String,
        clientMutationId: String,
    ): JSONObject = jsonRequest(
        "/v1/documents/$documentId/restore",
        "POST",
        JSONObject().put("clientMutationId", clientMutationId).put("deviceId", credentials.deviceId),
        credentials.accessToken,
    )

    fun conflicts(credentials: SyncCredentials): JSONObject = request(
        "/v1/conflicts",
        "GET",
        "application/json",
        null,
        credentials.accessToken,
    )

    fun resolveConflict(
        credentials: SyncCredentials,
        conflictId: String,
        resolution: String,
        clientMutationId: String,
    ): JSONObject = jsonRequest(
        "/v1/conflicts/$conflictId/resolve",
        "POST",
        JSONObject().put("clientMutationId", clientMutationId).put("resolution", resolution),
        credentials.accessToken,
    )

    fun downloadFile(
        credentials: SyncCredentials,
        fileObjectId: String,
        target: File,
        expectedHash: String,
        expectedSize: Long,
    ) {
        if (target.isFile && target.length() == expectedSize && target.sha256() == expectedHash) return
        target.delete()
        check(target.parentFile?.let { it.exists() || it.mkdirs() } == true) { "object directory unavailable" }
        val temporary = File(target.parentFile, "${target.name}.tmp-${System.nanoTime()}")
        val connection = URL(serverUrl.trimEnd('/') + "/v1/files/$fileObjectId").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "GET"
            connection.connectTimeout = NetworkTimeoutMillis
            connection.readTimeout = NetworkTimeoutMillis
            connection.setRequestProperty("Accept", "application/octet-stream")
            connection.setRequestProperty("Authorization", "Bearer ${credentials.accessToken}")
            val status = connection.responseCode
            if (status !in 200..299) {
                val response = connection.errorStream?.use { it.readBytes() } ?: ByteArray(0)
                val body = if (response.isEmpty()) JSONObject() else JSONObject(String(response))
                throw SyncApiException(status, body.optString("errorCode", "E_INTERNAL"), body.optString("error"))
            }
            val digest = MessageDigest.getInstance("SHA-256")
            var size = 0L
            FileOutputStream(temporary).use { output ->
                connection.inputStream.use { input ->
                    val buffer = ByteArray(DownloadBufferBytes)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        size += count
                        if (size > expectedSize) throw IOException("download exceeds declared size")
                        digest.update(buffer, 0, count)
                        output.write(buffer, 0, count)
                    }
                }
                output.flush()
                output.fd.sync()
            }
            val actualHash = "sha256:" + digest.digest().joinToString("") { "%02x".format(it) }
            if (size != expectedSize || actualHash != expectedHash) {
                throw SyncApiException(422, "E_HASH_MISMATCH", "download hash mismatch")
            }
            if (!temporary.renameTo(target)) throw IOException("object replace failed")
        } finally {
            temporary.delete()
            connection.disconnect()
        }
    }

    private fun credentials(response: JSONObject): SyncCredentials = SyncCredentials(
        serverUrl = serverUrl,
        accessToken = response.getString("accessToken"),
        refreshToken = response.getString("refreshToken"),
        expiresAt = response.getString("expiresAt"),
        deviceId = response.getJSONObject("device").getString("id"),
        cursor = null,
    )

    private fun jsonRequest(
        path: String,
        method: String,
        body: JSONObject,
        accessToken: String? = null,
    ): JSONObject = request(path, method, "application/json", body.toString().toByteArray(), accessToken)

    private fun binaryRequest(
        path: String,
        method: String,
        body: ByteArray,
        accessToken: String,
    ): JSONObject = request(path, method, "application/octet-stream", body, accessToken)

    private fun request(
        path: String,
        method: String,
        contentType: String,
        body: ByteArray?,
        accessToken: String?,
    ): JSONObject {
        val connection = URL(serverUrl.trimEnd('/') + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = NetworkTimeoutMillis
            connection.readTimeout = NetworkTimeoutMillis
            connection.doOutput = body != null
            connection.setRequestProperty("Content-Type", contentType)
            connection.setRequestProperty("Accept", "application/json")
            if (accessToken != null) connection.setRequestProperty("Authorization", "Bearer $accessToken")
            if (body != null) connection.outputStream.use { it.write(body) }
            val status = connection.responseCode
            val responseBytes = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.use { it.readBytes() }
                ?: ByteArray(0)
            val response = if (responseBytes.isEmpty()) JSONObject() else JSONObject(String(responseBytes))
            if (status !in 200..299) {
                throw SyncApiException(status, response.optString("errorCode", "E_INTERNAL"), response.optString("error"))
            }
            return response
        } catch (error: SyncApiException) {
            throw error
        } catch (error: IOException) {
            throw error
        } finally {
            connection.disconnect()
        }
    }

    private companion object {
        const val NetworkTimeoutMillis = 15_000
        const val DownloadBufferBytes = 64 * 1024
    }
}

private fun File.sha256(): String {
    val digest = MessageDigest.getInstance("SHA-256")
    inputStream().use { input ->
        val buffer = ByteArray(64 * 1024)
        while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            digest.update(buffer, 0, count)
        }
    }
    return "sha256:" + digest.digest().joinToString("") { "%02x".format(it) }
}

class SyncApiException(val status: Int, val errorCode: String, message: String) : IOException(message)
