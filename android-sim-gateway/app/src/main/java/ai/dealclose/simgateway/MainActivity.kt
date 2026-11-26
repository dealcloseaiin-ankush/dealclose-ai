package ai.dealclose.simgateway

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

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
        settings.userAgentString = "${settings.userAgentString} DealCloseApp/1.7.0 (Android Native Luxury)"

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
                // If main production domain fails, fallback to ngrok tunnel
                val failingUrl = request?.url?.toString() ?: ""
                if (failingUrl.contains("dealcloseai.in") && !failingUrl.contains("poser-sassy-subsidy")) {
                    val headers = HashMap<String, String>()
                    headers["ngrok-skip-browser-warning"] = "true"
                    webViewApp.loadUrl("https://poser-sassy-subsidy.ngrok-free.dev/mobile", headers)
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
        val headers = HashMap<String, String>()
        headers["ngrok-skip-browser-warning"] = "true"
        webViewApp.loadUrl("https://dealcloseai.in/mobile", headers)
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
        val prefs = getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
        val savedCode = prefs.getString("pairing_code", "884219") ?: "884219"

        val serviceIntent = Intent(this, GatewayWorkerService::class.java).apply {
            putExtra("pairing_code", savedCode)
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
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
        fun getAppVersion(): String = "1.7.0"
    }
}
