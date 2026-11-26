package ai.dealclose.simgateway

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.telecom.Call
import android.telecom.InCallService
import android.telephony.SubscriptionManager
import android.util.Log

/**
 * 🚀 DEALCLOSE INCALL SERVICE (SMART DUAL-SIM FILTER)
 * ====================================================================
 * Rules:
 * 1. SIM 1 (Personal Slot 0):
 *    - Completely BYPASSED. AI audio bridge is NEVER started.
 *    - User talks to their friends, family, personal callers normally.
 * 2. SIM 2 (AI Dedicated Slot 1):
 *    - Handled 100% by AI for business calling.
 *    - Incoming: Auto-answers after 1.2s.
 *    - Active: Streams audio to DealClose AI Server for automated closing.
 *    - Outgoing: Controlled by DealClose Cloud Webhook.
 */
class DealCloseInCallService : InCallService() {

    companion object {
        private const val TAG = "DealCloseInCall"
        var activeCall: Call? = null
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        val handleStr = call.details?.handle?.schemeSpecificPart ?: "Unknown"
        val callDirection = if (call.details?.callDirection == Call.Details.DIRECTION_INCOMING) "INCOMING" else "OUTGOING"
        Log.d(TAG, "📞 [InCallService] Call Added: $handleStr ($callDirection)")

        val prefs = applicationContext.getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
        val dedicatedSlot = prefs.getInt("ai_sim_slot", -1) // -1 = All SIMs / Single SIM (Default), 0 = SIM 1, 1 = SIM 2
        val simSlot = detectCallSimSlot(call)

        Log.d(TAG, "📶 Call SIM Slot detected: $simSlot (Dedicated AI Slot: $dedicatedSlot)")

        // 🛡️ PERSONAL CALL FILTER:
        // Only bypass if user explicitly configured a dedicated slot (0 or 1) and this call is on the other slot.
        // If dedicatedSlot is -1 (default), handle incoming business calls on all active SIMs.
        if (dedicatedSlot != -1 && simSlot != -1 && simSlot != dedicatedSlot) {
            Log.d(TAG, "👤 [PERSONAL CALL on SIM ${simSlot + 1}] Bypassing AI. (Designated AI slot is SIM ${dedicatedSlot + 1})")
            return
        }

        // 🤖 DEDICATED AI CALL
        activeCall = call

        // If incoming call on AI SIM, auto-answer after 1.2s ring
        if (call.state == Call.STATE_RINGING) {
            val simLabel = if (dedicatedSlot == -1) "Active SIM" else "SIM ${dedicatedSlot + 1}"
            Log.d(TAG, "🔔 [AI INCOMING] Customer calling business number ($simLabel). Auto-answering in 1.2s...")
            Handler(Looper.getMainLooper()).postDelayed({
                if (call.state == Call.STATE_RINGING) {
                    call.answer(0)
                }
            }, 1200)
        }

        call.registerCallback(object : Call.Callback() {
            override fun onStateChanged(call: Call, state: Int) {
                super.onStateChanged(call, state)
                when (state) {
                    Call.STATE_DIALING -> {
                        Log.d(TAG, "🔄 State: Dialing number on AI SIM...")
                    }
                    Call.STATE_ACTIVE -> {
                        Log.d(TAG, "✅ State: Call CONNECTED / ACTIVE on AI SIM! Starting AI voice bridge...")
                        AudioBridgeManager.startAudioBridge(applicationContext)
                    }
                    Call.STATE_DISCONNECTED -> {
                        Log.d(TAG, "📵 State: Call DISCONNECTED / ENDED.")
                        AudioBridgeManager.stopAudioBridge()
                        if (activeCall == call) {
                            activeCall = null
                        }
                    }
                }
            }
        })
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        Log.d(TAG, "🔌 Call Removed from InCallService.")
        if (activeCall == call) {
            AudioBridgeManager.stopAudioBridge()
            activeCall = null
        }
    }

    /**
     * Determines which SIM Slot (0 for SIM 1, 1 for SIM 2) the call belongs to.
     * Returns -1 if unable to determine.
     */
    private fun detectCallSimSlot(call: Call): Int {
        try {
            val accountHandle = call.details?.accountHandle ?: return -1
            val handleId = accountHandle.id ?: return -1

            val subManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            val subList = subManager?.activeSubscriptionInfoList ?: return -1

            for (info in subList) {
                val subIdStr = info.subscriptionId.toString()
                val iccId = info.iccId ?: ""
                if (handleId.contains(subIdStr) || (iccId.isNotEmpty() && handleId.contains(iccId))) {
                    return info.simSlotIndex // 0 = SIM 1, 1 = SIM 2
                }
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "READ_PHONE_STATE permission missing for SIM slot detection: ${e.message}")
        } catch (e: Exception) {
            Log.w(TAG, "SIM Slot detection exception: ${e.message}")
        }
        return -1
    }
}
