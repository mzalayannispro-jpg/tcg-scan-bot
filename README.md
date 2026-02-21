# TCG Scan Bot (MVP)

A unified system to **scan trading cards in real-time** (Mobile) or via **uploads** (Web), identify cards, pull market data, and output investment KPIs.

## Components

### 1. Web App (Next.js)
- **Repo Root**: Main dashboard and card resolution logic.
- Features: manual upload, Tesseract.js OCR, Prisma/SQLite storage.
- API: Pluggable providers (Pokémon, MTG, Scryfall).

### 2. Mobile App (Android)
- **Location**: `/android` folder.
- Features: 
  - **SCAN LIVE**: Real-time screen capture during live streams (Whatnot, eBay Live).
  - Floating Overlay: Draggable UI to view prices while staying in your live app.
  - "AutoBet" Engine: Instant GOOD/DIRTY alerts based on market price discounts.

## Features (Integrated)
- Real-time Screen Capture (1-2 fps) via Android MediaProjection.
- Integrated KPI engine:
  - Budget rules & Discount targets (30-50% vs market average).
  - Condition risk (Good/Dirty/Unknown).
- Market providers for Pokémon (Pokémon TCG API) and MTG (Scryfall).

## Roadmap
- [ ] Connect Android app to the Next.js API for real OCR/data.
- [ ] Add seller evaluation signals (Whatnot).
- [ ] "Record" mode for refund/return evidence.

---

Made for your GitHub repo: **tcg-scan-bot**.
