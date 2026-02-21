package com.tcgscan.bot

import android.graphics.Bitmap

data class ScanResult(
    val cardName: String,
    val setInfo: String,
    val rarity: String,
    val marketPrice: Double,
    val currentPrice: Double,
    val decision: String,
    val trend: String
)

object TcgAnalyzer {
    private val mockCards = listOf(
        ScanResult("Charizard VMAX", "Shining Fates", "★★★", 65.0, 42.0, "GOOD", "+5%"),
        ScanResult("Pikachu V", "Vivid Voltage", "★★", 25.0, 11.5, "GOOD", "-2%"),
        ScanResult("Lugia GX", "Lost Thunder", "★★★", 120.0, 58.0, "DIRTY", "+1%"),
        ScanResult("Mewtwo VSTAR", "Crown Zenith", "★★★", 40.0, 18.0, "DIRTY", "+10%")
    )

    fun analyzeBitmap(bitmap: Bitmap): ScanResult {
        // Simulation: 30% discount = GOOD, 50%+ discount = DIRTY/STEAL
        return mockCards.random()
    }

    fun getDecisionColor(decision: String): String {
        return when (decision) {
            "GOOD" -> "#00FF88" // Matrix Green
            "DIRTY" -> "#FFD700" // Gold/Dirty
            else -> "#FF4444" // Red
        }
    }
}
