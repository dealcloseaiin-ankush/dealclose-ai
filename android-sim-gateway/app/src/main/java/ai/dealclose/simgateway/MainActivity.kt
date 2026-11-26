package ai.dealclose.simgateway

import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.TelecomManager
import android.view.View
import android.webkit.*
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * 🚀 DEALCLOSE AI - UNIFIED FULL BUSINESS APP & SIM GATEWAY
 * ====================================================================
 * - Hosts the Full MSME Business Suite (CRM, Video Studio, Khata,
 *   WhatsApp Auto-pilot, Google Reviews, AI Calling) in a native WebView.
 * - Runs the 24/7 Cellular Voice Gateway Service silently in the background.
 * - No technical pairing screen on first launch — pure modern business experience!
 */
class MainActivity : AppCompatActivity() {

    private val REQUEST_CODE_SET_DEFAULT_DIALER = 1001
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_RESULT_CODE = 1002

    private lateinit var webViewApp: WebView
    private lateinit var loadingProgress: ProgressBar
    private lateinit var bannerPermissions: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webViewApp = findViewById(R.id.webViewApp)
        loadingProgress = findViewById(R.id.loadingProgress)
        bannerPermissions = findViewById(R.id.bannerPermissions)

        val btnEnableSIM = findViewById<Button>(R.id.btnEnableSIM)
        val btnDismissBanner = findViewById<Button>(R.id.btnDismissBanner)
        val tvCloseBanner = findViewById<TextView>(R.id.tvCloseBanner)

        // 1. Setup Full-Feature WebView
        setupWebView()

        // 2. Auto-Start Background SIM Calling Service
        autoStartGatewayWorker()

        // 3. Permission Banner Handlers
        btnEnableSIM.setOnClickListener {
            requestDefaultDialerRole()
        }
        btnDismissBanner.setOnClickListener {
            bannerPermissions.visibility = View.GONE
        }
        tvCloseBanner.setOnClickListener {
            bannerPermissions.visibility = View.GONE
        }

        // Check if dialer role needed (only show subtle banner if not granted)
        val prefs = getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
        val bannerDismissed = prefs.getBoolean("banner_dismissed", false)
        if (!isDefaultDialer() && !bannerDismissed) {
            bannerPermissions.visibility = View.VISIBLE
        }

        // 4. Handle Hardware Back Button for In-App Navigation
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

        // User Agent
        settings.userAgentString = "${settings.userAgentString} DealCloseApp/1.4.0 (Android Native)"

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
            }
        }

        webViewApp.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                loadingProgress.progress = newProgress
                if (newProgress == 100) {
                    loadingProgress.visibility = View.GONE
                }
            }

            // Support camera and file uploads for product photos & videos
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
        // Priority: Saved Tunnel / Cloud URL -> Poser Ngrok Live Tunnel -> DealClose Cloud
        val prefs = getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
        val activeHost = prefs.getString("active_server_url", "https://poser-sassy-subsidy.ngrok-free.dev") ?: "https://poser-sassy-subsidy.ngrok-free.dev"
        val mobileUrl = "$activeHost/mobile"

        webViewApp.loadUrl(mobileUrl)
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

    private fun isDefaultDialer(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = getSystemService(RoleManager::class.java)
            roleManager?.isRoleHeld(RoleManager.ROLE_DIALER) == true
        } else {
            val telecomManager = getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            telecomManager?.defaultDialerPackage == packageName
        }
    }

    private fun requestDefaultDialerRole() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = getSystemService(RoleManager::class.java)
            if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)) {
                val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
                startActivityForResult(intent, REQUEST_CODE_SET_DEFAULT_DIALER)
            }
        } else {
            val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
                putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, packageName)
            }
            startActivityForResult(intent, REQUEST_CODE_SET_DEFAULT_DIALER)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_SET_DEFAULT_DIALER) {
            if (resultCode == Activity.RESULT_OK) {
                bannerPermissions.visibility = View.GONE
                Toast.makeText(this, "✅ SIM Calling Activated Successfully!", Toast.LENGTH_SHORT).show()
            }
        } else if (requestCode == FILE_CHOOSER_RESULT_CODE) {
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
