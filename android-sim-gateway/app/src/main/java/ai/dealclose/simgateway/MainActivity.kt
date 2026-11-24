package ai.dealclose.simgateway

import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.telecom.TelecomManager
import android.widget.Button
import android.widget.EditText
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * 📱 DEALCLOSE SIM GATEWAY - MAIN SETUP SCREEN (DUAL SIM MANAGED)
 * ====================================================================
 * Dedicated AI SIM:
 * - SIM 2 (Default / Recommended): Handled 100% by AI for business calling.
 * - SIM 1: Stays 100% Personal. AI bypasses personal calls completely.
 */
class MainActivity : AppCompatActivity() {

    private val REQUEST_CODE_SET_DEFAULT_DIALER = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val btnSetDefault = findViewById<Button>(R.id.btnSetDefaultDialer)
        val btnBattery = findViewById<Button>(R.id.btnBatteryOptimization)
        val btnPair = findViewById<Button>(R.id.btnPairDevice)
        val etPairingCode = findViewById<EditText>(R.id.etPairingCode)
        val tvStatus = findViewById<TextView>(R.id.tvStatus)

        // Dual SIM Selection
        val prefs = getSharedPreferences("DealClosePrefs", Context.MODE_PRIVATE)
        val rgSim = findViewById<RadioGroup>(R.id.rgSimSelection)
        val rbSim1 = findViewById<RadioButton>(R.id.rbSim1)
        val rbSim2 = findViewById<RadioButton>(R.id.rbSim2)

        // Load saved slot (Default is 1 = SIM 2)
        val savedSlot = prefs.getInt("ai_sim_slot", 1)
        if (savedSlot == 0) {
            rbSim1.isChecked = true
        } else {
            rbSim2.isChecked = true
        }

        rgSim.setOnCheckedChangeListener { _, checkedId ->
            val slot = if (checkedId == R.id.rbSim1) 0 else 1
            prefs.edit().putInt("ai_sim_slot", slot).apply()
            val simLabel = if (slot == 0) "SIM 1" else "SIM 2"
            val personalLabel = if (slot == 0) "SIM 2" else "SIM 1"
            Toast.makeText(this, "AI Dedicated to $simLabel! ($personalLabel stays 100% Personal)", Toast.LENGTH_SHORT).show()
        }

        // 1. SET AS DEFAULT PHONE APP (Bypass Android Mic Restriction)
        btnSetDefault.setOnClickListener {
            requestDefaultDialerRole()
        }

        // 2. DISABLE BATTERY RESTRICTIONS (Phone can sit locked at home 24/7)
        btnBattery.setOnClickListener {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:$packageName")
            }
            startActivity(intent)
        }

        // 3. PAIR WITH DEALCLOSE WEB DASHBOARD
        btnPair.setOnClickListener {
            val code = etPairingCode.text.toString().trim()
            if (code.isEmpty()) {
                Toast.makeText(this, "Please enter Pairing Code from Dashboard", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Start Foreground Service
            val serviceIntent = Intent(this, GatewayWorkerService::class.java).apply {
                putExtra("pairing_code", code)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }

            tvStatus.text = "🟢 STATUS: ACTIVE & CONNECTED TO DEALCLOSE CLOUD"
            Toast.makeText(this, "SIM Gateway Activated! SIM 2 is now your AI agent.", Toast.LENGTH_LONG).show()
        }
    }

    private fun requestDefaultDialerRole() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = getSystemService(RoleManager::class.java)
            if (roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)) {
                val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
                startActivityForResult(intent, REQUEST_CODE_SET_DEFAULT_DIALER)
            }
        } else {
            val telecomManager = getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            if (telecomManager.defaultDialerPackage != packageName) {
                val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
                    putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, packageName)
                }
                startActivityForResult(intent, REQUEST_CODE_SET_DEFAULT_DIALER)
            } else {
                Toast.makeText(this, "DealClose is already Default Phone App!", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_SET_DEFAULT_DIALER) {
            if (resultCode == Activity.RESULT_OK) {
                Toast.makeText(this, "✅ Default Phone App Activated! Microphone Restriction Bypassed.", Toast.LENGTH_LONG).show()
            }
        }
    }
}
