package com.tcgscan.bot

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.core.app.NotificationCompat

class ScreenCaptureService : Service() {

    companion object {
        private const val CHANNEL_ID = "TCG_SCAN_CHANNEL"
        private const val NOTIFICATION_ID = 1
    }

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    private val handler = Handler(Looper.getMainLooper())
    private var capturing = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        setupOverlay()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // 1. D'ABORD : Lancer le Foreground Service officiellement
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID, 
                createNotification(), 
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            )
        } else {
            startForeground(NOTIFICATION_ID, createNotification())
        }

        // 2. ENSUITE : Seulement quand le système a validé l'étape 1, demander la MediaProjection
        val resultCode = intent?.getIntExtra("resultCode", 0) ?: 0
        val data = intent?.getParcelableExtra<Intent>("data")

        if (data != null && mediaProjection == null) {
            try {
                val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                mediaProjection = mpm.getMediaProjection(resultCode, data)
            } catch (e: SecurityException) {
                e.printStackTrace()
                stopSelf() // Force exit if permission fails
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        stopCapture()
        removeOverlay()
        mediaProjection?.stop()
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "TCG Scan Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("TCG Scan Bot")
            .setContentText("Analyse de l'écran active")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .build()
    }

    private fun setupOverlay() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 100
            y = 100
        }

        overlayView = LayoutInflater.from(this).inflate(R.layout.overlay_scan, null)
        val btnToggle = overlayView!!.findViewById<Button>(R.id.btnToggleScan)
        val resultText = overlayView!!.findViewById<TextView>(R.id.resultText)

        btnToggle.setOnClickListener {
            if (capturing) {
                stopCapture()
                capturing = false
                btnToggle.text = "SCAN OFF"
                resultText.text = "Scan arrêté."
            } else {
                startCapture()
                capturing = true
                btnToggle.text = "SCAN ON"
                resultText.text = "Recherche..."
            }
        }

        // Draggable logic
        overlayView!!.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f

            override fun onTouch(v: View?, event: MotionEvent?): Boolean {
                when (event?.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = layoutParams.x
                        initialY = layoutParams.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        layoutParams.x = initialX + (event.rawX - initialTouchX).toInt()
                        layoutParams.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager.updateViewLayout(overlayView, layoutParams)
                        return true
                    }
                }
                return false
            }
        })

        windowManager.addView(overlayView, layoutParams)
    }

    private fun removeOverlay() {
        overlayView?.let { windowManager.removeView(it) }
        overlayView = null
    }

    private fun startCapture() {
        val metrics = resources.displayMetrics
        imageReader = ImageReader.newInstance(metrics.widthPixels, metrics.heightPixels, PixelFormat.RGBA_8888, 2)
        try {
            virtualDisplay = mediaProjection?.createVirtualDisplay(
                "TCGScan", metrics.widthPixels, metrics.heightPixels, metrics.densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, imageReader!!.surface, null, null
            )
        } catch (e: SecurityException) {
            e.printStackTrace()
            val resultText = overlayView?.findViewById<TextView>(R.id.resultText)
            resultText?.text = "Erreur: L'application bloque la capture d'écran."
            resultText?.setTextColor(Color.RED)
            stopCapture()
            capturing = false
            overlayView?.findViewById<Button>(R.id.btnToggleScan)?.text = "SCAN OFF"
            return
        }

        handler.post(object : Runnable {
            override fun run() {
                if (!capturing) return
                try {
                    val image = imageReader?.acquireLatestImage()
                    image?.let {
                        val bitmap = ImageUtils.imageToBitmap(it)
                        if (bitmap != null) {
                            val result = TcgAnalyzer.analyzeBitmap(bitmap)
                            updateUI(result)
                        }
                        it.close()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                handler.postDelayed(this, 1500L)
            }
        })
    }

    private fun stopCapture() {
        virtualDisplay?.release()
        virtualDisplay = null
        imageReader?.close()
        imageReader = null
        handler.removeCallbacksAndMessages(null)
    }

    private fun updateUI(result: ScanResult) {
        val resultText = overlayView?.findViewById<TextView>(R.id.resultText)
        resultText?.text = "${result.cardName} (${result.setInfo})\n${result.rarity} | ${result.decision}\nPrice: ${result.currentPrice}€ (Mkt: ${result.marketPrice}€)"
        resultText?.setTextColor(Color.parseColor(TcgAnalyzer.getDecisionColor(result.decision)))
    }
}
