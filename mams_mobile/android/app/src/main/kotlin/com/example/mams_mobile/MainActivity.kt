package com.example.mams_mobile

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream

class MainActivity : FlutterFragmentActivity() {
    private val CHANNEL = "com.example.mams_mobile/audio"
    private val PICK_DOCUMENT_REQUEST = 2005
    private var mediaRecorder: MediaRecorder? = null
    private var currentAudioPath: String? = null
    private var mediaPlayer: MediaPlayer? = null
    private var pendingDocResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startRecording" -> {
                    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED
                    ) {
                        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 2001)
                        result.error("PERMISSION_NEEDED", "Please allow microphone permission and tap the mic again.", null)
                        return@setMethodCallHandler
                    }
                    try {
                        stopRecordingInternal()
                        val outFile = File(cacheDir, "voice_note_${System.currentTimeMillis()}.m4a")
                        currentAudioPath = outFile.absolutePath

                        val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            MediaRecorder(this)
                        } else {
                            @Suppress("DEPRECATION")
                            MediaRecorder()
                        }
                        recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
                        recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                        recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                        recorder.setAudioSamplingRate(44100)
                        recorder.setAudioEncodingBitRate(96000)
                        recorder.setOutputFile(outFile.absolutePath)
                        recorder.prepare()
                        recorder.start()
                        mediaRecorder = recorder
                        result.success(outFile.absolutePath)
                    } catch (e: Exception) {
                        result.error("RECORD_ERROR", e.localizedMessage ?: "Could not start recording", null)
                    }
                }
                "stopRecording" -> {
                    try {
                        val path = currentAudioPath
                        stopRecordingInternal()
                        result.success(path)
                    } catch (e: Exception) {
                        result.error("STOP_ERROR", e.localizedMessage ?: "Could not stop recording", null)
                    }
                }
                "playAudio" -> {
                    val url = call.argument<String>("url")
                    if (url.isNullOrBlank()) {
                        result.error("INVALID_URL", "Audio URL is empty", null)
                        return@setMethodCallHandler
                    }
                    try {
                        stopPlayerInternal()
                        val player = MediaPlayer()
                        player.setDataSource(url)
                        player.setOnPreparedListener { mp ->
                            mp.start()
                        }
                        player.setOnCompletionListener {
                            stopPlayerInternal()
                        }
                        player.prepareAsync()
                        mediaPlayer = player
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("PLAY_ERROR", e.localizedMessage ?: "Could not play audio", null)
                    }
                }
                "stopAudio" -> {
                    stopPlayerInternal()
                    result.success(true)
                }
                "pickDocument" -> {
                    pendingDocResult = result
                    try {
                        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "*/*"
                        }
                        @Suppress("DEPRECATION")
                        startActivityForResult(intent, PICK_DOCUMENT_REQUEST)
                    } catch (e: Exception) {
                        pendingDocResult = null
                        result.error("DOC_PICK_ERROR", e.localizedMessage ?: "Could not open document picker", null)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == PICK_DOCUMENT_REQUEST) {
            val callback = pendingDocResult
            pendingDocResult = null
            if (callback == null) return

            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                val uri: Uri = data.data!!
                try {
                    var displayName = "document_${System.currentTimeMillis()}"
                    contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (nameIndex >= 0 && cursor.moveToFirst()) {
                            displayName = cursor.getString(nameIndex) ?: displayName
                        }
                    }
                    val safeName = displayName.replace(Regex("[^a-zA-Z0-9._\\- ]"), "_")
                    val destFile = File(cacheDir, safeName)
                    contentResolver.openInputStream(uri)?.use { input ->
                        FileOutputStream(destFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                    callback.success(mapOf("path" to destFile.absolutePath, "name" to displayName))
                } catch (e: Exception) {
                    callback.error("DOC_COPY_ERROR", e.localizedMessage ?: "Could not read selected document", null)
                }
            } else {
                callback.success(null)
            }
        }
    }

    private fun stopRecordingInternal() {
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
        } catch (_: Exception) {
        } finally {
            mediaRecorder = null
        }
    }

    private fun stopPlayerInternal() {
        try {
            mediaPlayer?.apply {
                if (isPlaying) stop()
                release()
            }
        } catch (_: Exception) {
        } finally {
            mediaPlayer = null
        }
    }

    override fun onDestroy() {
        stopRecordingInternal()
        stopPlayerInternal()
        super.onDestroy()
    }
}


