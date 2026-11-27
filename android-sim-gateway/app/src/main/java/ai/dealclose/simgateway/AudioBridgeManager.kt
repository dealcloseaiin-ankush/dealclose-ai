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
 * 🎧 AUDIO BRIDGE MANAGER
 * ====================================================================
 * Captures in-call microphone stream (16kHz 16-bit PCM Linear)
 * Sends Base64 audio to Node.js backend (/api/webhooks/mobile/stream)
 * Receives AI TTS speech and plays it into the active cellular call.
 */
object AudioBridgeManager {

    private const val TAG = "AudioBridgeManager"
    private const val SAMPLE_RATE = 16000
    private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
    private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var webSocket: WebSocket? = null
    private var audioTrack: AudioTrack? = null

    fun startAudioBridge(context: Context, callerPhone: String? = null) {
        // CRITICAL FIX: The backend WebSocket server runs on Render (dealclose-ai.onrender.com).
        // Vercel (dealcloseai.in) is a serverless proxy and terminates/404s WebSockets.
        // Therefore, we MUST direct WebSocket streams directly to the Render backend!
        val serverUrl = "wss://dealclose-ai.onrender.com/api/webhooks/mobile/stream"

        Log.d(TAG, "🌐 Connecting WebSocket Audio Stream to: $serverUrl")

        // 1. Setup AudioTrack for AI Speech Playback (Modern AudioAttributes)
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

        // 2. Setup AudioManager for In-Call Communications (Keep room quiet)
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager.isSpeakerphoneOn = false // Default to false so loudspeaker does NOT blast into room!

        // Boost voice call and media volume to maximum
        try {
            val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL)
            audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL, maxVol, 0)
            val maxMusic = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxMusic, 0)
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
                // Send Start Event with Caller Number
                val startMsg = JSONObject().apply {
                    put("event", "start")
                    put("timestamp", System.currentTimeMillis())
                    if (!callerPhone.isNullOrBlank()) {
                        put("phone", callerPhone)
                    }
                }
                ws.send(startMsg.toString())
                startMicStreaming()
            }

            override fun onMessage(ws: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    val event = json.optString("event")

                    if (event == "audio") {
                        // Received AI Speech from Deepgram/Gemini
                        val base64Audio = json.optString("data")
                        val pcmBytes = Base64.decode(base64Audio, Base64.DEFAULT)
                        // Strip 44-byte WAV RIFF header if present to ensure pure linear PCM
                        val rawPCM = if (pcmBytes.size > 44 && pcmBytes[0] == 'R'.code.toByte() && pcmBytes[1] == 'I'.code.toByte() && pcmBytes[2] == 'F'.code.toByte() && pcmBytes[3] == 'F'.code.toByte()) {
                            pcmBytes.copyOfRange(44, pcmBytes.size)
                        } else {
                            pcmBytes
                        }
                        Log.d(TAG, "🔊 [AudioTrack] Playing ${rawPCM.size} raw PCM bytes into call loudspeaker!")
                        val written = audioTrack?.write(rawPCM, 0, rawPCM.size) ?: 0
                        Log.d(TAG, "🔊 [AudioTrack] Bytes written successfully: $written")
                    } else if (event == "ai_response") {
                        Log.d(TAG, "🤖 [AI Spoke]: ${json.optString("text")}")
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

    private fun startMicStreaming() {
        val minBuf = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        try {
            // Priority 1: AudioSource.VOICE_RECOGNITION
            // Crucial fix: Bypasses Android telephony AEC & AGC that suppresses mic during live GSM calls!
            var recordInstance: AudioRecord? = null
            val sources = intArrayOf(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                MediaRecorder.AudioSource.MIC,
                MediaRecorder.AudioSource.VOICE_COMMUNICATION
            )

            for (src in sources) {
                try {
                    val r = AudioRecord(src, SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT, minBuf * 2)
                    if (r.state == AudioRecord.STATE_INITIALIZED) {
                        recordInstance = r
                        Log.d(TAG, "🎤 [Microphone] Successfully initialized AudioRecord with AudioSource: $src")
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
            Log.d(TAG, "🎤 [Microphone] Audio streaming started successfully.")

            Thread {
                val buffer = ByteArray(minBuf)
                var packetCount = 0L
                while (isRecording && audioRecord?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                    val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (read > 0) {
                        packetCount++
                        val base64 = Base64.encodeToString(buffer, 0, read, Base64.NO_WRAP)
                        val audioMsg = JSONObject().apply {
                            put("event", "audio")
                            put("data", base64)
                        }
                        webSocket?.send(audioMsg.toString())

                        // Periodically compute and log audio RMS amplitude to verify customer speech is entering mic
                        if (packetCount % 50L == 0L) {
                            var sum = 0L
                            for (i in 0 until read step 2) {
                                val sample = (buffer[i + 1].toInt() shl 8) or (buffer[i].toInt() and 0xFF)
                                sum += sample * sample
                            }
                            val rms = Math.sqrt((sum / (read / 2)).toDouble())
                            Log.d(TAG, "🎤 [Mic Stream] Sent $packetCount packets. Input RMS amplitude: $rms")
                        }
                    }
                }
            }.start()
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for AudioRecord (RECORD_AUDIO not granted)", e)
        } catch (e: Throwable) {
            Log.e(TAG, "Unexpected error in AudioRecord start", e)
        }
    }

    fun stopAudioBridge() {
        isRecording = false
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
