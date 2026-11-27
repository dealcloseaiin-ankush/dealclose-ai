package ai.dealclose.simgateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telecom.Call
import android.telecom.InCallService
import android.telecom.TelecomManager
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * 🚀 DEALCLOSE INCALL SERVICE (SMART DUAL-SIM FILTER & DIALER ENGINE)
 * ====================================================================
 * Rules:
 * 1. UI Presentation:
 *    - Always displays InCallActivity (or Full-Screen Heads-Up Notification)
 *      so the user ALWAYS sees incoming calls with caller number, SIM slot,
 *      and Answer / Decline buttons.
 * 2. Dual-SIM Intelligence:
 *    - If call is on Dedicated AI SIM (or All SIMs selected):
 *      Auto-answers after 1.2s delay and connects AI Voice Bridge (AudioBridgeManager).
 *    - If call is on Personal SIM:
 *      Does NOT auto-answer. User sees "Personal Call" and picks up manually to talk.
 * 3. Auto-Answer Reliability:
 *    - Evaluated in BOTH onCallAdded and onStateChanged (STATE_RINGING)
 *      ensuring zero missed calls on any Android OEM.
 */
class DealCloseInCallService : InCallService() {

    companion object {
        private const val TAG = "DealCloseInCall"
        private const val CALL_NOTIFICATION_ID = 9001
        private const val CHANNEL_ID = "DealCloseIncomingCallChannel"

        var activeCall: Call? = null

        fun answerCurrentCall() {
            try {
                activeCall?.let { call ->
                    if (call.state == Call.STATE_RINGING) {
                        call.answer(0)
                        Log.d(TAG, "🟢 Call answered manually via UI button.")
                    }
                }
            } catch (e: Throwable) {
                Log.e(TAG, "Error answering call: ${e.message}")
            }
        }

        fun disconnectCurrentCall() {
            try {
                activeCall?.let { call ->
                    call.disconnect()
                    Log.d(TAG, "🔴 Call disconnected manually via UI button.")
                }
            } catch (e: Throwable) {
                Log.e(TAG, "Error disconnecting call: ${e.message}")
            }
        }
    }

    private var hasAutoAnswered = false
    private val autoAnswerHandler = Handler(Looper.getMainLooper())

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        activeCall = call
        hasAutoAnswered = false

        val handleStr = call.details?.handle?.schemeSpecificPart ?: "Unknown Caller"
        val callDirection = if (call.details?.callDirection == Call.Details.DIRECTION_INCOMING) "INCOMING" else "OUTGOING"
        Log.d(TAG, "📞 [InCallService] Call Added: $handleStr ($callDirection)")

        val prefs = applicationContext.getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
        val dedicatedSlot = prefs.getInt("ai_sim_slot", -1) // -1 = All SIMs (Default), 0 = SIM 1, 1 = SIM 2
        val simSlot = detectCallSimSlot(call)

        // Determine if AI should take this call
        // If user set dedicatedSlot to -1 (All SIMs) -> AI handles it
        // If simSlot could not be resolved (-1) -> fallback to AI handling
        // If user set SIM 1 (0) and call is on SIM 1 (0) -> AI handles it
        // If user set SIM 2 (1) and call is on SIM 2 (1) -> AI handles it
        // Otherwise (e.g. dedicated is SIM 2 but call is on SIM 1) -> Personal Call
        val isAiCall = (dedicatedSlot == -1 || simSlot == -1 || simSlot == dedicatedSlot)

        Log.d(TAG, "📶 Call Analysis: detectedSlot=$simSlot, dedicatedSlot=$dedicatedSlot => isAiCall=$isAiCall")

        // 1. Show In-Call Screen (Activity & Heads-up Notification)
        showCallInterface(call, handleStr, simSlot, isAiCall)

        // 2. Register State Change Callback
        call.registerCallback(object : Call.Callback() {
            override fun onStateChanged(call: Call, state: Int) {
                super.onStateChanged(call, state)
                InCallActivity.updateCallState(state)

                when (state) {
                    Call.STATE_RINGING -> {
                        Log.d(TAG, "🔔 State: Call is RINGING...")
                        if (isAiCall) {
                            scheduleAutoAnswer(call)
                        }
                    }
                    Call.STATE_DIALING -> {
                        Log.d(TAG, "🔄 State: Dialing number...")
                    }
                    Call.STATE_ACTIVE -> {
                        Log.d(TAG, "✅ State: Call CONNECTED / ACTIVE!")
                        dismissCallNotification()
                        if (isAiCall) {
                            Log.d(TAG, "🤖 Starting AI voice bridge for automated call...")
                            AudioBridgeManager.startAudioBridge(applicationContext)
                        } else {
                            Log.d(TAG, "👤 Personal call active. AI audio bridge bypassed.")
                        }
                    }
                    Call.STATE_DISCONNECTED -> {
                        Log.d(TAG, "📵 State: Call DISCONNECTED / ENDED.")
                        autoAnswerHandler.removeCallbacksAndMessages(null)
                        AudioBridgeManager.stopAudioBridge()
                        dismissCallNotification()
                        if (activeCall == call) {
                            activeCall = null
                        }
                    }
                }
            }
        })

        // 3. If call is already in ringing state at the time of onCallAdded, trigger auto-answer
        if (call.state == Call.STATE_RINGING && isAiCall) {
            scheduleAutoAnswer(call)
        }
    }

    private fun scheduleAutoAnswer(call: Call) {
        if (hasAutoAnswered) return
        hasAutoAnswered = true

        Log.d(TAG, "🤖 [AI AUTO-ANSWER] Scheduling answer in 1200ms...")
        autoAnswerHandler.postDelayed({
            try {
                if (call.state == Call.STATE_RINGING) {
                    Log.d(TAG, "⚡ [AI AUTO-ANSWER] Answering call now!")
                    call.answer(0)
                }
            } catch (e: Throwable) {
                Log.e(TAG, "Auto-answer failed: ${e.message}")
            }
        }, 1200)
    }

    private fun showCallInterface(call: Call, callerNumber: String, simSlot: Int, isAiCall: Boolean) {
        try {
            createCallNotificationChannel()

            val intent = Intent(applicationContext, InCallActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("caller_number", callerNumber)
                putExtra("sim_slot", simSlot)
                putExtra("is_ai_call", isAiCall)
            }

            val pendingIntent = PendingIntent.getActivity(
                applicationContext,
                101,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            val modeText = if (isAiCall) "DealClose AI Answering..." else "Personal Call"
            val simText = if (simSlot >= 0) "SIM ${simSlot + 1}" else "Cellular"

            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.sym_call_incoming)
                .setContentTitle("Incoming Call: $callerNumber")
                .setContentText("[$simText] $modeText")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(pendingIntent, true)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setOngoing(true)
                .build()

            val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notifManager.notify(CALL_NOTIFICATION_ID, notification)

            // Also directly launch the Activity
            applicationContext.startActivity(intent)
        } catch (e: Throwable) {
            Log.e(TAG, "Error displaying InCall screen: ${e.message}")
        }
    }

    private fun createCallNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build()

            val channel = NotificationChannel(
                CHANNEL_ID,
                "DealClose Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High Priority Heads-Up Incoming Call Notification"
                setSound(ringtoneUri, audioAttributes)
                enableVibration(true)
            }

            val notifManager = getSystemService(NotificationManager::class.java)
            notifManager.createNotificationChannel(channel)
        }
    }

    private fun dismissCallNotification() {
        try {
            val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notifManager.cancel(CALL_NOTIFICATION_ID)
        } catch (ignored: Throwable) {}
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        Log.d(TAG, "🔌 Call Removed from InCallService.")
        autoAnswerHandler.removeCallbacksAndMessages(null)
        if (activeCall == call) {
            AudioBridgeManager.stopAudioBridge()
            activeCall = null
        }
        dismissCallNotification()
    }

    /**
     * Determines which SIM Slot (0 for SIM 1, 1 for SIM 2) the call belongs to.
     * Uses multi-factor detection across account handles, sub IDs, carrier labels, and extras.
     */
    private fun detectCallSimSlot(call: Call): Int {
        try {
            val details = call.details ?: return -1
            val extras = details.extras

            // Factor 1: Direct extras check
            if (extras != null) {
                val subIdFromExtra = extras.getInt("android.telephony.extra.SUBSCRIPTION_ID", -1)
                if (subIdFromExtra != -1) {
                    val slot = getSlotIndexFromSubId(subIdFromExtra)
                    if (slot != -1) return slot
                }
            }

            val accountHandle = details.accountHandle ?: return -1
            val handleId = accountHandle.id ?: ""

            // Factor 2: Telecom PhoneAccount Label check (e.g. "SIM 1", "SIM 2", "Jio 1", "Airtel 2")
            val telecomManager = getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            if (telecomManager != null) {
                val phoneAccount = telecomManager.getPhoneAccount(accountHandle)
                val label = phoneAccount?.label?.toString()?.lowercase() ?: ""
                if (label.contains("sim 2") || label.contains("slot 2") || label.contains("sub 2") || label.endsWith(" 2")) {
                    return 1
                } else if (label.contains("sim 1") || label.contains("slot 1") || label.contains("sub 1") || label.endsWith(" 1")) {
                    return 0
                }
            }

            // Factor 3: SubscriptionManager list comparison
            val subManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            val subList = subManager?.activeSubscriptionInfoList
            if (subList != null && subList.isNotEmpty()) {
                if (subList.size == 1) {
                    return subList[0].simSlotIndex
                }
                for (info in subList) {
                    val subIdStr = info.subscriptionId.toString()
                    val iccId = info.iccId ?: ""
                    if (handleId.contains(subIdStr) || (iccId.isNotEmpty() && handleId.contains(iccId))) {
                        return info.simSlotIndex // 0 = SIM 1, 1 = SIM 2
                    }
                }
            }

            // Factor 4: Numeric handleId fallback (0 or 1)
            if (handleId == "0") return 0
            if (handleId == "1") return 1

        } catch (e: SecurityException) {
            Log.w(TAG, "READ_PHONE_STATE permission missing: ${e.message}")
        } catch (e: Exception) {
            Log.w(TAG, "SIM Slot detection exception: ${e.message}")
        }
        return -1
    }

    private fun getSlotIndexFromSubId(subId: Int): Int {
        try {
            val subManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            val subList = subManager?.activeSubscriptionInfoList ?: return -1
            for (info in subList) {
                if (info.subscriptionId == subId) {
                    return info.simSlotIndex
                }
            }
        } catch (ignored: Exception) {}
        return -1
    }
}
