package ai.dealclose.simgateway

import android.Manifest
import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.telecom.TelecomManager
import android.util.Log
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * 🚀 DEALCLOSE AI - LUXURY NATIVE BUSINESS APPLICATION (v1.7.0)
 * ====================================================================
 * - Deep OLED Midnight Black shell with zero white flicker (#060608).
 * - Full Hardware Back Navigation: Modals, drawers, and tabs close smoothly
 *   in-app instead of suddenly killing the app.
 * - Double-Tap to Exit safeguard with native Toast.
 * - Native Haptic Engine: Physical vibration feel on taps.
 * - Zero overscroll stretch & hidden web scrollbars for 100% native luxury feel.
 * - Silent Background Voice/SIM Telephony Gateway.
 */
class MainActivity : AppCompatActivity() {

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_RESULT_CODE = 1002

    private lateinit var webViewApp: WebView
    private lateinit var loadingProgress: ProgressBar
    private var lastBackPressedTime: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Hardware Accelerated & Luxury Edge-to-Edge Theme
        window.setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        )
        window.statusBarColor = Color.parseColor("#060608")
        window.navigationBarColor = Color.parseColor("#060608")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(true)
        }

        setContentView(R.layout.activity_main)

        webViewApp = findViewById(R.id.webViewApp)
        loadingProgress = findViewById(R.id.loadingProgress)

        // 2. Setup Luxury WebView Environment
        setupLuxuryWebView()

        // 3. Start Background Voice Gateway Service Silently
        autoStartGatewayWorker()

        // 4. Smart In-App Hardware Back Button Handler
        setupSmartBackNavigation()

        // 5. Check and Request Cellular & Audio Permissions for AI Voice Call Engine
        checkAndRequestVoicePermissions()
    }

    private fun checkAndRequestVoicePermissions() {
        val permissions = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_PHONE_STATE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            permissions.add(Manifest.permission.ANSWER_PHONE_CALLS)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 101)
        }
    }

    private fun setupLuxuryWebView() {
        webViewApp.setBackgroundColor(Color.parseColor("#060608"))
        webViewApp.overScrollMode = View.OVER_SCROLL_NEVER
        webViewApp.isVerticalScrollBarEnabled = false
        webViewApp.isHorizontalScrollBarEnabled = false

        val settings = webViewApp.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // User Agent Identifier
        settings.userAgentString = "${settings.userAgentString} DealCloseApp/1.7.4 (Android Native Luxury)"

        // Add Native JavaScript Bridge for Haptics & System Control
        webViewApp.addJavascriptInterface(AndroidNativeBridge(this, webViewApp), "AndroidBridge")

        webViewApp.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                loadingProgress.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                loadingProgress.visibility = View.GONE
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                loadingProgress.visibility = View.GONE
                // If main production domain fails, fallback to render domain
                val failingUrl = request?.url?.toString() ?: ""
                if (failingUrl.contains("dealcloseai.in") && !failingUrl.contains("dealclose-ai.onrender.com")) {
                    webViewApp.loadUrl("https://dealclose-ai.onrender.com/mobile")
                }
            }
        }

        webViewApp.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                loadingProgress.progress = newProgress
                if (newProgress == 100) {
                    loadingProgress.visibility = View.GONE
                }
            }

            override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                try {
                    Toast.makeText(this@MainActivity, message ?: "", Toast.LENGTH_SHORT).show()
                } catch (ignored: Throwable) {}
                result?.confirm()
                return true
            }

            override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                result?.confirm()
                return true
            }

            // Support camera and gallery uploads for product studio & video polisher
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                try {
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE)
                } catch (e: Exception) {
                    fileUploadCallback = null
                    return false
                }
                return true
            }
        }

        // Load the DealClose Mobile App
        webViewApp.loadUrl("https://dealcloseai.in/mobile")
    }

    private fun setupSmartBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Query JavaScript if any in-app drawer, modal, subscreen or tab needs to go back
                val script = "(function() { try { return window.handleHardwareBack ? window.handleHardwareBack() : 'exit'; } catch(e) { return 'exit'; } })()"
                webViewApp.evaluateJavascript(script) { result ->
                    val cleanResult = result?.replace("\"", "")?.trim()
                    
                    if (cleanResult == "handled") {
                        // In-app modal, subscreen, or tab was navigated back. Do not close app!
                        return@evaluateJavascript
                    }

                    // Otherwise if browser history exists, go back
                    if (webViewApp.canGoBack()) {
                        webViewApp.goBack()
                        return@evaluateJavascript
                    }

                    // At root screen: Require double-press within 2 seconds to exit
                    val currentTime = System.currentTimeMillis()
                    if (currentTime - lastBackPressedTime < 2000) {
                        isEnabled = false
                        finish()
                    } else {
                        lastBackPressedTime = currentTime
                        Toast.makeText(this@MainActivity, "Press back again to exit DealClose", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })
    }

    private fun autoStartGatewayWorker() {
        try {
            val prefs = getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
            val savedCode = prefs.getString("pairing_code", "") ?: ""

            val serviceIntent = Intent(this, GatewayWorkerService::class.java).apply {
                if (savedCode.isNotEmpty()) {
                    putExtra("pairing_code", savedCode)
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (e: Throwable) {
            Log.e("MainActivity", "Failed to start GatewayWorkerService: ${e.message}")
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (fileUploadCallback != null) {
                val results = if (resultCode == Activity.RESULT_OK && data != null) {
                    val dataString = data.dataString
                    if (dataString != null) {
                        arrayOf(Uri.parse(dataString))
                    } else null
                } else null
                fileUploadCallback?.onReceiveValue(results)
                fileUploadCallback = null
            }
        }
    }

    /**
     * ⚡ Native Android Javascript Bridge
     * Gives web code access to native Android haptics, notifications, and back events.
     */
    inner class AndroidNativeBridge(private val context: Context, private val view: View) {

        @JavascriptInterface
        fun triggerHaptic() {
            runOnUiThread {
                try {
                    view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                        val vibrator = vibratorManager?.defaultVibrator
                        vibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK))
                    } else {
                        @Suppress("DEPRECATION")
                        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                        vibrator?.vibrate(25)
                    }
                } catch (ignored: Exception) {}
            }
        }

        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun isNativeApp(): Boolean = true

        @JavascriptInterface
        fun getAppVersion(): String = "1.7.4"

        @JavascriptInterface
        fun requestDefaultDialerRole() {
            runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val roleManager = context.getSystemService(RoleManager::class.java)
                        if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)) {
                            if (!roleManager.isRoleHeld(RoleManager.ROLE_DIALER)) {
                                val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
                                (context as? Activity)?.startActivityForResult(intent, 1003)
                            } else {
                                Toast.makeText(context, "DealClose is already your Default Calling App! ✅", Toast.LENGTH_SHORT).show()
                            }
                        }
                    } else {
                        val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                        if (telecomManager != null && telecomManager.defaultDialerPackage != context.packageName) {
                            val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
                                putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, context.packageName)
                            }
                            (context as? Activity)?.startActivity(intent)
                        } else {
                            Toast.makeText(context, "DealClose is already your Default Calling App! ✅", Toast.LENGTH_SHORT).show()
                        }
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "Please set DealClose as Default Phone App in Android Settings", Toast.LENGTH_LONG).show()
                }
            }
        }

        @JavascriptInterface
        fun isDefaultDialer(): Boolean {
            return try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val roleManager = context.getSystemService(RoleManager::class.java)
                    roleManager?.isRoleHeld(RoleManager.ROLE_DIALER) ?: false
                } else {
                    val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                    telecomManager?.defaultDialerPackage == context.packageName
                }
            } catch (e: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun setAiSimSlot(slot: Int) {
            runOnUiThread {
                try {
                    val prefs = context.getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
                    prefs.edit().putInt("ai_sim_slot", slot).apply()
                    val label = when(slot) {
                        0 -> "SIM 1"
                        1 -> "SIM 2"
                        else -> "All Active SIMs / Single SIM"
                    }
                    showToast("AI Dedicated Calling Slot set to: $label")
                } catch (e: Throwable) {
                    Log.e("AndroidBridge", "setAiSimSlot error: ${e.message}")
                }
            }
        }

        @JavascriptInterface
        fun getAiSimSlot(): Int {
            return try {
                val prefs = context.getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
                prefs.getInt("ai_sim_slot", -1)
            } catch (e: Throwable) {
                -1
            }
        }

        @JavascriptInterface
        fun setPairingCode(code: String) {
            runOnUiThread {
                try {
                    val prefs = context.getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
                    prefs.edit().putString("pairing_code", code).apply()
                    try {
                        autoStartGatewayWorker()
                    } catch (serviceErr: Throwable) {
                        Log.e("AndroidBridge", "Could not start gateway service: ${serviceErr.message}")
                    }
                    showToast("Pairing Code: $code linked! ✅")
                } catch (e: Throwable) {
                    Log.e("AndroidBridge", "setPairingCode error: ${e.message}")
                }
            }
        }

        @JavascriptInterface
        fun getDeviceId(): String {
            return try {
                android.os.Build.MODEL + "_" + SettingsSecureId(context)
            } catch (e: Throwable) {
                "AndroidPhone_" + android.os.Build.MODEL
            }
        }

        @JavascriptInterface
        fun getPairingCode(): String {
            return try {
                val prefs = context.getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
                prefs.getString("pairing_code", "") ?: ""
            } catch (e: Throwable) {
                ""
            }
        }
    }

    companion object {
        fun SettingsSecureId(context: Context): String {
            return try {
                android.provider.Settings.Secure.getString(
                    context.contentResolver,
                    android.provider.Settings.Secure.ANDROID_ID
                ) ?: "UNKNOWN_ID"
            } catch (e: Throwable) {
                "UNKNOWN_ID"
            }
        }
    }
}
