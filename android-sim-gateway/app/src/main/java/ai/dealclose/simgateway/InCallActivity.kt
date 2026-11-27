package ai.dealclose.simgateway

import android.app.KeyguardManager
import android.content.Context
import android.graphics.Color
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telecom.Call
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * 📞 INCALL ACTIVITY
 * ====================================================================
 * High-end In-Call Screen displayed for incoming & active calls.
 * - Shows on Lock Screen & Turns Screen ON automatically.
 * - Distinguishes between AI Dedicated Calls and Personal SIM Calls.
 * - Provides live timer, Speaker, End Call, and "Take Over" controls.
 */
class InCallActivity : AppCompatActivity() {

    companion object {
        var currentInstance: InCallActivity? = null

        fun updateCallState(state: Int) {
            Handler(Looper.getMainLooper()).post {
                currentInstance?.onCallStateChanged(state)
            }
        }
    }

    private lateinit var tvSimBadge: TextView
    private lateinit var tvAiModePill: TextView
    private lateinit var tvAvatarIcon: TextView
    private lateinit var tvCallerName: TextView
    private lateinit var tvCallerNumber: TextView
    private lateinit var tvCallStatus: TextView
    private lateinit var tvAiNote: TextView
    private var tvSpeakerLabel: TextView? = null

    private lateinit var layoutRingingControls: LinearLayout
    private lateinit var layoutActiveControls: LinearLayout
    private lateinit var btnAnswerCall: Button
    private lateinit var btnDeclineCall: Button
    private lateinit var btnEndCall: Button
    private lateinit var btnTakeOver: Button
    private lateinit var btnSpeaker: Button

    private var audioManager: AudioManager? = null
    private var isSpeakerOn = false
    private var isAiCall = true
    private var callSeconds = 0
    private val timerHandler = Handler(Looper.getMainLooper())
    private var isTimerRunning = false

    private val timerRunnable = object : Runnable {
        override fun run() {
            callSeconds++
            val mins = callSeconds / 60
            val secs = callSeconds % 60
            val timeStr = String.format("%02d:%02d", mins, secs)
            if (isAiCall) {
                tvCallStatus.text = "🟢 AI Agent Speaking • $timeStr"
            } else {
                tvCallStatus.text = "🟢 Call Active • $timeStr"
            }
            timerHandler.postDelayed(this, 1000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        currentInstance = this

        // 1. Turn screen ON and show over lock screen
        setupLockScreenFlags()

        setContentView(R.layout.activity_in_call)

        audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager

        initViews()
        populateCallData()
        setupListeners()

        // Check if call is already connected
        val call = DealCloseInCallService.activeCall
        if (call != null && call.state == Call.STATE_ACTIVE) {
            onCallStateChanged(Call.STATE_ACTIVE)
        }
    }

    private fun setupLockScreenFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            keyguardManager?.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.statusBarColor = Color.parseColor("#07090E")
        window.navigationBarColor = Color.parseColor("#07090E")
    }

    private fun initViews() {
        tvSimBadge = findViewById(R.id.tvSimBadge)
        tvAiModePill = findViewById(R.id.tvAiModePill)
        tvAvatarIcon = findViewById(R.id.tvAvatarIcon)
        tvCallerName = findViewById(R.id.tvCallerName)
        tvCallerNumber = findViewById(R.id.tvCallerNumber)
        tvCallStatus = findViewById(R.id.tvCallStatus)
        tvAiNote = findViewById(R.id.tvAiNote)
        tvSpeakerLabel = findViewById(R.id.tvSpeakerLabel)

        layoutRingingControls = findViewById(R.id.layoutRingingControls)
        layoutActiveControls = findViewById(R.id.layoutActiveControls)
        btnAnswerCall = findViewById(R.id.btnAnswerCall)
        btnDeclineCall = findViewById(R.id.btnDeclineCall)
        btnEndCall = findViewById(R.id.btnEndCall)
        btnTakeOver = findViewById(R.id.btnTakeOver)
        btnSpeaker = findViewById(R.id.btnSpeaker)
    }

    private fun populateCallData() {
        val number = intent.getStringExtra("caller_number") ?: "Unknown"
        val simSlot = intent.getIntExtra("sim_slot", -1)
        isAiCall = intent.getBooleanExtra("is_ai_call", true)

        tvCallerNumber.text = number
        tvCallerName.text = if (isAiCall) "Customer Calling" else "Personal Call"

        // SIM Badge (Clean Android Dialing Style)
        if (simSlot >= 0) {
            tvSimBadge.text = "📶 SIM ${simSlot + 1} • Cellular"
        } else {
            tvSimBadge.text = "📶 Cellular Phone Call"
        }

        // AI vs Personal Mode UI Presentation
        if (isAiCall) {
            tvAvatarIcon.text = "🤖"
            tvAiModePill.text = "🤖 DealClose AI Voice Agent"
            tvAiModePill.setTextColor(Color.parseColor("#34D399"))
            tvCallStatus.text = "🔔 Incoming Call • AI Answering in 1s..."
            tvAiNote.text = "AI Digital Counter Assistant is ready..."
            btnTakeOver.visibility = View.VISIBLE
        } else {
            tvAvatarIcon.text = "👤"
            tvAiModePill.text = "👤 Personal Call (Normal Mode)"
            tvAiModePill.setTextColor(Color.parseColor("#94A3B8"))
            tvCallStatus.text = "🔔 Incoming Personal Call"
            tvAiNote.text = "Tap Answer to talk directly."
            btnTakeOver.visibility = View.GONE
        }
    }

    private fun setupListeners() {
        btnAnswerCall.setOnClickListener {
            DealCloseInCallService.answerCurrentCall()
            onCallStateChanged(Call.STATE_ACTIVE)
        }

        btnDeclineCall.setOnClickListener {
            DealCloseInCallService.disconnectCurrentCall()
            finish()
        }

        btnEndCall.setOnClickListener {
            DealCloseInCallService.disconnectCurrentCall()
            finish()
        }

        btnTakeOver.setOnClickListener {
            // Stop AI Voice Bridge and allow user to speak directly
            AudioBridgeManager.stopAudioBridge()
            isAiCall = false
            tvAiModePill.text = "👤 Personal Takeover Active"
            tvAiModePill.setTextColor(Color.parseColor("#93C5FD"))
            tvAiNote.text = "AI Disconnected. Aap ab customer se live baat kar rahe hain."
            btnTakeOver.visibility = View.GONE
        }

        btnSpeaker.setOnClickListener {
            toggleSpeaker()
        }
    }

    private fun toggleSpeaker() {
        audioManager?.let { am ->
            isSpeakerOn = !isSpeakerOn
            am.isSpeakerphoneOn = isSpeakerOn
            btnSpeaker.text = if (isSpeakerOn) "🔊" else "🔈"
            tvSpeakerLabel?.text = if (isSpeakerOn) "Speaker ON" else "Speaker OFF"
        }
    }

    fun onCallStateChanged(state: Int) {
        when (state) {
            Call.STATE_ACTIVE -> {
                layoutRingingControls.visibility = View.GONE
                layoutActiveControls.visibility = View.VISIBLE
                if (!isTimerRunning) {
                    isTimerRunning = true
                    timerHandler.post(timerRunnable)
                }
            }
            Call.STATE_DISCONNECTED -> {
                tvCallStatus.text = "📵 Call Ended"
                timerHandler.removeCallbacks(timerRunnable)
                Handler(Looper.getMainLooper()).postDelayed({
                    finish()
                }, 800)
            }
        }
    }

    override fun onDestroy() {
        timerHandler.removeCallbacks(timerRunnable)
        if (currentInstance == this) {
            currentInstance = null
        }
        super.onDestroy()
    }
}
