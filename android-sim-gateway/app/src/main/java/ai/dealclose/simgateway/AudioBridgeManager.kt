package ai.dealclose.simgateway

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.util.Base64
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * 🎧 AUDIO BRIDGE MANAGER (ACOUSTIC HALF-DUPLEX COMPANION ENGINE)
 * ====================================================================
 * - Captures in-call microphone stream (16kHz 16-bit PCM Linear).
 * - Half-Duplex: Drops mic frames while AI speech is playing + 350ms tail guard.
 * - Volume Guard: Limits speaker volume to 65% (prevents physical distortion & mic clipping).
 * - Audio Source Preference: Supports VOICE_COMMUNICATION & VOICE_RECOGNITION with explicit logging.
 * - Soft Normalization: Prevents PCM clipping and distortion.
 * - Handles 'interrupt' (barge-in AudioTrack flush) & 'hangup' events.
 */
object AudioBridgeManager {

    private const val TAG = "AudioBridgeManager"
    private const val SAMPLE_RATE = 16000
    private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
    private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    private const val TAIL_GUARD_MS = 350L

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var webSocket: WebSocket? = null
    private var audioTrack: AudioTrack? = null

    // Half-duplex tracking: Epoch millis until which mic frames are suppressed
    @Volatile
    private var aiPlaybackEndTime = 0L

    fun startAudioBridge(context: Context, callerPhone: String? = null) {
        val serverUrl = "wss://dealclose-ai.onrender.com/api/webhooks/mobile/stream"
        Log.d(TAG, "🌐 Connecting WebSocket Audio Stream to: $serverUrl")

        // 1. Setup AudioTrack for AI Speech Playback
        val minTrackBuf = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AUDIO_FORMAT
        )
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        val audioFormat = AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(SAMPLE_RATE)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .build()
        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(audioAttributes)
            .setAudioFormat(audioFormat)
            .setBufferSizeInBytes(minTrackBuf * 4)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        audioTrack?.play()

        // 2. Setup AudioManager: Set Speaker Volume to 65% (within 60-70% requirement)
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager.isSpeakerphoneOn = true

        try {
            val maxVoiceVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL)
            val targetVoiceVol = (maxVoiceVol * 0.65).toInt().coerceAtLeast(1)
            audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL, targetVoiceVol, 0)

            val maxMusicVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val targetMusicVol = (maxMusicVol * 0.65).toInt().coerceAtLeast(1)
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetMusicVol, 0)

            Log.i(TAG, "🔊 [Volume Guard] Speakerphone volume set to 65% (Voice: $targetVoiceVol/$maxVoiceVol, Media: $targetMusicVol/$maxMusicVol)")
        } catch (vErr: Throwable) {
            Log.w(TAG, "Volume set exception: ${vErr.message}")
        }

        // 3. Connect to Backend WebSocket
        val client = OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build()

        val request = Request.Builder().url(serverUrl).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.d(TAG, "✅ [WebSocket] Connected to DealClose Voice Server!")
                val startMsg = JSONObject().apply {
                    put("event", "start")
                    put("timestamp", System.currentTimeMillis())
                    if (!callerPhone.isNullOrBlank()) {
                        put("phone", callerPhone)
                    }
                }
                ws.send(startMsg.toString())
                startMicStreaming(context)
            }

            override fun onMessage(ws: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    when (json.optString("event")) {
                        "audio" -> {
                            val base64Audio = json.optString("data")
                            val pcmBytes = Base64.decode(base64Audio, Base64.DEFAULT)
                            val rawPCM = if (pcmBytes.size > 44 &&
                                pcmBytes[0] == 'R'.code.toByte() &&
                                pcmBytes[1] == 'I'.code.toByte() &&
                                pcmBytes[2] == 'F'.code.toByte() &&
                                pcmBytes[3] == 'F'.code.toByte()
                            ) {
                                pcmBytes.copyOfRange(44, pcmBytes.size)
                            } else {
                                pcmBytes
                            }

                            // 16kHz 16-bit mono = 32 bytes/ms
                            val durationMs = (rawPCM.size / 32).toLong()
                            aiPlaybackEndTime = System.currentTimeMillis() + durationMs + TAIL_GUARD_MS
                            Log.d(TAG, "🔊 [AudioTrack] Playing ${rawPCM.size} bytes ($durationMs ms). Half-duplex tail guard active for ${durationMs + TAIL_GUARD_MS}ms")

                            audioTrack?.write(rawPCM, 0, rawPCM.size)
                        }
                        "ai_response" -> {
                            Log.d(TAG, "🤖 [AI Spoke]: ${json.optString("text")}")
                        }
                        "interrupt" -> {
                            // Barge-in: flush AudioTrack immediately when customer interrupts
                            Log.d(TAG, "🚨 [Barge-in] Customer interrupted! Flushing AudioTrack playback buffer.")
                            try {
                                audioTrack?.pause()
                                audioTrack?.flush()
                                audioTrack?.play()
                                aiPlaybackEndTime = 0L
                            } catch (iErr: Throwable) {
                                Log.w(TAG, "Error on audio interrupt: ${iErr.message}")
                            }
                        }
                        "hangup" -> {
                            Log.d(TAG, "📴 [Hangup Event] Disconnecting call per backend request.")
                            DealCloseInCallService.disconnectCurrentCall()
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error handling message", e)
                }
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "❌ WebSocket Stream Failure: ${t.message}")
            }
        })
    }

    private fun startMicStreaming(context: Context) {
        val minBuf = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        try {
            val prefs = context.getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
            val configuredSource = prefs.getString("audio_source_type", "VOICE_COMMUNICATION") ?: "VOICE_COMMUNICATION"

            val primarySourceId = if (configuredSource == "VOICE_RECOGNITION") {
                MediaRecorder.AudioSource.VOICE_RECOGNITION
            } else {
                MediaRecorder.AudioSource.VOICE_COMMUNICATION
            }

            var recordInstance: AudioRecord? = null
            val sources = intArrayOf(
                primarySourceId,
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                MediaRecorder.AudioSource.MIC
            )

            var chosenSourceName = configuredSource
            for (src in sources) {
                try {
                    val r = AudioRecord(src, SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT, minBuf * 2)
                    if (r.state == AudioRecord.STATE_INITIALIZED) {
                        recordInstance = r
                        chosenSourceName = when (src) {
                            MediaRecorder.AudioSource.VOICE_COMMUNICATION -> "VOICE_COMMUNICATION"
                            MediaRecorder.AudioSource.VOICE_RECOGNITION -> "VOICE_RECOGNITION"
                            MediaRecorder.AudioSource.MIC -> "MIC"
                            else -> "SRC_$src"
                        }
                        Log.i(TAG, "🎤 [AudioRecord] Initialized successfully with AudioSource: $chosenSourceName (ID: $src)")
                        break
                    }
                } catch (e: Throwable) {
                    Log.w(TAG, "AudioSource $src init failed: ${e.message}")
                }
            }

            if (recordInstance == null || recordInstance.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "❌ Failed to initialize any AudioRecord source!")
                return
            }

            audioRecord = recordInstance
            audioRecord?.startRecording()
            isRecording = true
            Log.d(TAG, "🎤 [Microphone] Audio streaming started successfully using $chosenSourceName.")

            Thread {
                val buffer = ByteArray(minBuf)
                var packetCount = 0L
                var droppedCount = 0L

                while (isRecording && audioRecord?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                    val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (read > 0) {
                        val now = System.currentTimeMillis()

                        // 🛡️ HALF-DUPLEX TAIL GUARD: Drop mic frames while AI audio is playing + 350ms tail
                        if (now < aiPlaybackEndTime) {
                            droppedCount++
                            if (droppedCount % 50L == 0L) {
                                Log.d(TAG, "🔇 [Half-Duplex] Dropping mic frames during AI playback + tail guard ($droppedCount dropped)")
                            }
                            continue
                        }

                        // Soft Limiter & Normalization: prevent PCM clipping
                        var sum = 0L
                        val sampleCount = read / 2
                        for (i in 0 until read step 2) {
                            var s = ((buffer[i + 1].toInt() shl 8) or (buffer[i].toInt() and 0xFF)).toShort().toInt()
                            if (s > 26000) s = 26000 + (s - 26000) / 4
                            else if (s < -26000) s = -26000 + (s + 26000) / 4

                            sum += s * s
                            buffer[i] = (s and 0xFF).toByte()
                            buffer[i + 1] = ((s shr 8) and 0xFF).toByte()
                        }

                        packetCount++
                        val base64 = Base64.encodeToString(buffer, 0, read, Base64.NO_WRAP)
                        val audioMsg = JSONObject().apply {
                            put("event", "audio")
                            put("data", base64)
                        }
                        webSocket?.send(audioMsg.toString())

                        if (packetCount % 50L == 0L) {
                            val rms = Math.sqrt((sum / Math.max(sampleCount, 1)).toDouble())
                            Log.d(TAG, "🎤 [Mic Stream] Sent $packetCount packets. Input RMS: $rms")
                        }
                    }
                }
            }.start()
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for AudioRecord", e)
        } catch (e: Throwable) {
            Log.e(TAG, "Unexpected error in AudioRecord start", e)
        }
    }

    fun stopAudioBridge() {
        isRecording = false
        aiPlaybackEndTime = 0L
        try {
            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
            webSocket?.close(1000, "Call Ended")
            webSocket = null
            Log.d(TAG, "⏹️ Audio Bridge Stopped Cleanly.")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping bridge", e)
        }
    }
}
