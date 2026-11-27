package ai.dealclose.simgateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.telecom.TelecomManager
import android.util.Log
import androidx.core.app.NotificationCompat
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.Timer
import java.util.TimerTask
import java.util.concurrent.TimeUnit

/**
 * 🛰️ GATEWAY WORKER SERVICE
 * ====================================================================
 * Runs 24/7 in background even when phone is locked.
 * Sends battery & signal heartbeat to server every 45s.
 * Listens for remote calling commands triggered by DealClose Cloud / Local server.
 */
class GatewayWorkerService : Service() {

    private val CHANNEL_ID = "DealCloseSIMChannel"
    private val client = OkHttpClient.Builder().connectTimeout(6, TimeUnit.SECONDS).build()
    private var heartbeatTimer: Timer? = null

    // Multiple Candidate Server URLs for automatic network discovery
    private val candidateHosts = listOf(
        "https://dealcloseai.in",
        "https://dealclose-ai.onrender.com"
    )

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = createForegroundNotification()
        startForeground(101, notification)

        val pairingCode = intent?.getStringExtra("pairing_code") ?: ""
        if (pairingCode.isNotEmpty()) {
            registerWithServer(pairingCode)
        }

        startHeartbeatLoop()
        return START_STICKY
    }

    private fun registerWithServer(code: String) {
        Thread {
            val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val batteryLevel = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

            val body = JSONObject().apply {
                put("pairingCode", code)
                put("deviceId", Build.MODEL + "_" + SettingsSecureId(this@GatewayWorkerService))
                put("deviceName", "${Build.MANUFACTURER} ${Build.MODEL} (SIM Gateway)")
                put("batteryLevel", batteryLevel)
                put("isDefaultDialer", isDefaultDialer())
            }

            val prefs = getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)

            // Try each candidate URL until registration succeeds
            for (host in candidateHosts) {
                try {
                    val url = "$host/api/gateway/register"
                    Log.d("GatewayWorker", "Trying to register with server at: $url")

                    val req = Request.Builder()
                        .url(url)
                        .post(body.toString().toRequestBody("application/json".toMediaType()))
                        .build()

                    val resp = client.newCall(req).execute()
                    val respBody = resp.body?.string() ?: ""
                    Log.d("GatewayWorker", "Server Response ($url): HTTP ${resp.code} => $respBody")

                    if (resp.isSuccessful) {
                        prefs.edit()
                            .putString("active_server_url", host)
                            .putBoolean("is_paired", true)
                            .apply()
                        Log.d("GatewayWorker", "✅ Successfully Registered with $host!")
                        break
                    }
                } catch (e: Exception) {
                    Log.w("GatewayWorker", "Failed to connect to $host: ${e.message}")
                }
            }
        }.start()
    }

    private fun startHeartbeatLoop() {
        heartbeatTimer?.cancel()
        heartbeatTimer = Timer()
        heartbeatTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                try {
                    val prefs = getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
                    val host = prefs.getString("active_server_url", candidateHosts[0]) ?: candidateHosts[0]

                    val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
                    val batteryLevel = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

                    val body = JSONObject().apply {
                        put("deviceId", Build.MODEL + "_" + SettingsSecureId(this@GatewayWorkerService))
                        put("batteryLevel", batteryLevel)
                        put("isDefaultDialer", isDefaultDialer())
                    }

                    val req = Request.Builder()
                        .url("$host/api/gateway/heartbeat")
                        .post(body.toString().toRequestBody("application/json".toMediaType()))
                        .build()

                    val resp = client.newCall(req).execute()
                    val respStr = resp.body?.string() ?: ""
                    Log.d("GatewayWorker", "Heartbeat ACK: $respStr")
                } catch (e: Exception) {
                    Log.w("GatewayWorker", "Heartbeat Ping Failed: ${e.message}")
                }
            }
        }, 8000, 45000) // Every 45 seconds
    }

    private fun isDefaultDialer(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = getSystemService(RoleManager::class.java)
            roleManager.isRoleHeld(RoleManager.ROLE_DIALER)
        } else {
            val telecomManager = getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            telecomManager.defaultDialerPackage == packageName
        }
    }

    private fun SettingsSecureId(context: Context): String {
        return android.provider.Settings.Secure.getString(
            context.contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        ) ?: "UNKNOWN_ID"
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "DealClose SIM Gateway",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createForegroundNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("DealClose SIM Gateway Active")
            .setContentText("Connected to Cloud Server. Ready for automated voice calls.")
            .setSmallIcon(android.R.drawable.sym_call_outgoing)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        heartbeatTimer?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
