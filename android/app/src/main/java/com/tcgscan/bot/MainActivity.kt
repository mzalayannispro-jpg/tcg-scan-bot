package com.tcgscan.bot

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private val REQUEST_CAPTURE_CODE = 1001
    private val REQUEST_OVERLAY_CODE = 1002
    private lateinit var mediaProjectionManager: MediaProjectionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Installer le mouchard de crash
        Thread.setDefaultUncaughtExceptionHandler(CrashHandler(this))

        setContentView(R.layout.activity_main)

        // Vérifier s'il y a eu un crash précédent
        checkPreviousCrash()

        mediaProjectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager

        val btnScanLive = findViewById<Button>(R.id.btnScanLive)
        val statusText = findViewById<android.widget.TextView>(R.id.statusText)

        btnScanLive.setOnClickListener {
            statusText.text = "Vérification des permissions..."
            checkPermissionsAndStart()
        }
    }

    private fun checkPreviousCrash() {
        val prefs = getSharedPreferences("tcg_scan_prefs", Context.MODE_PRIVATE)
        val lastCrash = prefs.getString("last_crash_log", null)
        if (lastCrash != null) {
            android.app.AlertDialog.Builder(this)
                .setTitle("🚨 Oups ! Un crash a été détecté")
                .setMessage("L'application a planté la dernière fois. Voici l'erreur trouvée :\n\n$lastCrash")
                .setPositiveButton("Copier & Fermer") { dialog, _ ->
                    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                    val clip = android.content.ClipData.newPlainText("Crash Log", lastCrash)
                    clipboard.setPrimaryClip(clip)
                    Toast.makeText(this, "Erreur copiée ! Envoie-la au dév.", Toast.LENGTH_LONG).show()
                    prefs.edit().remove("last_crash_log").apply()
                    dialog.dismiss()
                }
                .setCancelable(false)
                .show()
        }
    }

    private val REQUEST_NOTIFICATION_CODE = 1003

    private fun checkPermissionsAndStart() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && 
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), REQUEST_NOTIFICATION_CODE)
            return
        }

        if (!Settings.canDrawOverlays(this)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivityForResult(intent, REQUEST_OVERLAY_CODE)
            Toast.makeText(this, "Active l'autorisation 'Afficher par-dessus les autres apps'.", Toast.LENGTH_LONG).show()
        } else {
            startCaptureIntent()
        }
    }

    private fun startCaptureIntent() {
        val captureIntent = mediaProjectionManager.createScreenCaptureIntent()
        startActivityForResult(captureIntent, REQUEST_CAPTURE_CODE)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == REQUEST_OVERLAY_CODE) {
            if (Settings.canDrawOverlays(this)) {
                startCaptureIntent()
            } else {
                findViewById<android.widget.TextView>(R.id.statusText).text = "Permission de superposition refusée."
            }
        } else if (requestCode == REQUEST_CAPTURE_CODE && resultCode == Activity.RESULT_OK && data != null) {
            val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
                putExtra("resultCode", resultCode)
                putExtra("data", data)
            }
            startForegroundService(serviceIntent)
            findViewById<android.widget.TextView>(R.id.statusText).text = "Service actif. Vous pouvez lancer Whatnot."
            Toast.makeText(this, "Scan lancé : retourne sur ton live.", Toast.LENGTH_LONG).show()
        } else {
            findViewById<android.widget.TextView>(R.id.statusText).text = "Autorisation de capture refusée."
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_NOTIFICATION_CODE) {
            // Continuer même si refusé, au moins on a demandé (recommandation Android 13+)
            // Ou on peut vérifier si c'est accordé. On relance la chaîne de vérification
            checkPermissionsAndStart()
        }
    }
}