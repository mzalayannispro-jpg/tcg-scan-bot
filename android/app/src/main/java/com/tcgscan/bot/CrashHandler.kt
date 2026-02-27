package com.tcgscan.bot

import android.content.Context
import android.util.Log
import java.io.PrintWriter
import java.io.StringWriter

class CrashHandler(private val context: Context) : Thread.UncaughtExceptionHandler {
    private val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()

    override fun uncaughtException(thread: Thread, throwable: Throwable) {
        try {
            val sw = StringWriter()
            throwable.printStackTrace(PrintWriter(sw))
            val stackTrace = sw.toString()

            // Sauvegarder l'erreur dans les SharedPreferences pour la lire au prochan lancement
            val prefs = context.getSharedPreferences("tcg_scan_prefs", Context.MODE_PRIVATE)
            prefs.edit().putString("last_crash_log", stackTrace).apply()
            
            Log.e("TCG_CRASH", "Fatal crash caught: $stackTrace")
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            // Laisser le système crasher normalement après avoir sauvegardé
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }
}
