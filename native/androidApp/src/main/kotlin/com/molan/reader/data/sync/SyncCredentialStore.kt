package com.molan.reader.data.sync

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class SyncCredentials(
    val serverUrl: String,
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: String,
    val deviceId: String,
    val cursor: String?,
)

class SyncCredentialStore(context: Context) {
    private val preferences = context.getSharedPreferences(PreferencesName, Context.MODE_PRIVATE)

    fun load(): SyncCredentials? = runCatching {
        val encoded = preferences.getString(CredentialsKey, null) ?: return null
        val envelope = JSONObject(encoded)
        val cipher = Cipher.getInstance(CipherTransformation)
        cipher.init(
            Cipher.DECRYPT_MODE,
            secretKey(),
            GCMParameterSpec(GcmTagBits, Base64.decode(envelope.getString("iv"), Base64.NO_WRAP)),
        )
        val clear = cipher.doFinal(Base64.decode(envelope.getString("ciphertext"), Base64.NO_WRAP))
        JSONObject(String(clear, Charsets.UTF_8)).let { json ->
            SyncCredentials(
                serverUrl = json.getString("serverUrl"),
                accessToken = json.getString("accessToken"),
                refreshToken = json.getString("refreshToken"),
                expiresAt = json.getString("expiresAt"),
                deviceId = json.getString("deviceId"),
                cursor = json.optString("cursor").takeIf(String::isNotBlank),
            )
        }
    }.getOrNull()

    fun save(credentials: SyncCredentials) {
        val clear = JSONObject()
            .put("serverUrl", credentials.serverUrl)
            .put("accessToken", credentials.accessToken)
            .put("refreshToken", credentials.refreshToken)
            .put("expiresAt", credentials.expiresAt)
            .put("deviceId", credentials.deviceId)
            .put("cursor", credentials.cursor ?: "")
            .toString()
            .toByteArray(Charsets.UTF_8)
        val cipher = Cipher.getInstance(CipherTransformation)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val envelope = JSONObject()
            .put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .put("ciphertext", Base64.encodeToString(cipher.doFinal(clear), Base64.NO_WRAP))
            .toString()
        check(preferences.edit().putString(CredentialsKey, envelope).commit()) { "sync credentials unavailable" }
    }

    fun clear() {
        check(preferences.edit().remove(CredentialsKey).commit()) { "sync credentials unavailable" }
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(AndroidKeyStore).apply { load(null) }
        (keyStore.getKey(KeyAlias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, AndroidKeyStore).run {
            init(
                KeyGenParameterSpec.Builder(
                    KeyAlias,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .build(),
            )
            generateKey()
        }
    }

    private companion object {
        const val PreferencesName = "molan.sync.credentials"
        const val CredentialsKey = "encrypted"
        const val AndroidKeyStore = "AndroidKeyStore"
        const val KeyAlias = "molan.sync.credentials.v1"
        const val CipherTransformation = "AES/GCM/NoPadding"
        const val GcmTagBits = 128
    }
}
