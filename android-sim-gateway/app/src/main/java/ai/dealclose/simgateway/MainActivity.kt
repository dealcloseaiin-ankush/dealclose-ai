package ai.dealclose.simgateway

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * 🚀 DEALCLOSE AI - OFFICIAL UNIFIED ANDROID APPLICATION
 * ====================================================================
 * - Loads the Complete Business Dashboard (CRM, Video Studio, Khata,
 *   WhatsApp Auto-pilot, Google Reviews, Onboarding, Products) instantly.
 * - Background Telephony service runs silently without disturbing the user.
 * - Zero startup permission harassment — opens clean and fast like any modern app.
 */
class MainActivity : AppCompatActivity() {

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_RESULT_CODE = 1002

    private lateinit var webViewApp: WebView
    private lateinit var loadingProgress: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webViewApp = findViewById(R.id.webViewApp)
        loadingProgress = findViewById(R.id.loadingProgress)

        // 1. Setup Full-Feature WebView
        setupWebView()

        // 2. Start Background Voice Gateway Service Silently
        autoStartGatewayWorker()

        // 3. Handle Hardware Back Button for In-App Navigation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webViewApp.canGoBack()) {
                    webViewApp.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun setupWebView() {
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
        settings.userAgentString = "${settings.userAgentString} DealCloseApp/1.6.0 (Android Native)"

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
                // If main production URL fails, try ngrok fallback once
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

            // Support camera and file uploads for product photos & video polisher
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
        val mobileUrl = "https://dealcloseai.in/mobile"

        webViewApp.loadUrl(mobileUrl, headers)
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
}
