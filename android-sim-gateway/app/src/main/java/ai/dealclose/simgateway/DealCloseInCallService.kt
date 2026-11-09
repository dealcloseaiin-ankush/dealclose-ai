package ai.dealclose.simgateway

import android.telecom.Call
import android.telecom.InCallService
import android.util.Log

/**
 * 🚀 DEALCLOSE INCALL SERVICE
 * ====================================================================
 * When set as the "Default Phone App", Android OS provides official
 * InCallService access to the active phone call.
 * This completely bypasses the cellular microphone restriction.
 */
class DealCloseInCallService : InCallService() {

    companion object {
        private const val TAG = "DealCloseInCall"
        var activeCall: Call? = null
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        activeCall = call
        Log.d(TAG, "📞 [InCallService] Call Added: ${call.details?.handle}")

        call.registerCallback(object : Call.Callback() {
            override fun onStateChanged(call: Call, state: Int) {
                super.onStateChanged(call, state)
                when (state) {
                    Call.STATE_DIALING -> {
                        Log.d(TAG, "🔄 State: Dialing number...")
                    }
                    Call.STATE_ACTIVE -> {
                        Log.d(TAG, "✅ State: Call CONNECTED / ACTIVE! Customer answered.")
                        // Start two-way audio streaming to DealClose AI Server
                        AudioBridgeManager.startAudioBridge(applicationContext)
                    }
                    Call.STATE_DISCONNECTED -> {
                        Log.d(TAG, "📵 State: Call DISCONNECTED / ENDED.")
                        AudioBridgeManager.stopAudioBridge()
                        activeCall = null
                    }
                }
            }
        })
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        Log.d(TAG, "🔌 Call Removed from InCallService.")
        AudioBridgeManager.stopAudioBridge()
        if (activeCall == call) {
            activeCall = null
        }
    }
}
