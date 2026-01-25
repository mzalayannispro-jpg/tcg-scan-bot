# TCG Scan Bot (MVP)

An MVP web app to **scan a trading card screenshot**, **identify the card**, **pull market data** (pluggable providers),
and output **KPIs + a buy/bid recommendation**.

This repo is built from your quick-sheet notes:
- Scan (OCR) ➜ Identify card ➜ Collect market data (Cardmarket/eBay/Whatnot*) ➜ Analyze ➜ Summarize KPIs ➜ Assist purchase (AutoBet rules)
- *Whatnot has no official public API for marketplace data; this repo includes a provider interface + stub so you can plug your own data source.*

## Features (implemented)
- Upload an image (screenshot/photo) from the browser
- OCR in-browser (Tesseract.js) to extract text
- Resolve card candidates:
  - Pokémon: Pokémon TCG API (public)
  - MTG: Scryfall (public)
- Market providers (pluggable):
  - Scryfall pricing (MTG)
  - Pokémon TCG API pricing (Pokémon)
  - Stub providers for eBay/Cardmarket/Whatnot (so the architecture is ready)
- KPI engine:
  - Avg price (from available providers)
  - Liquidity proxy (listing count / volume proxy when available)
  - Rarity proxy (uses API fields where possible, otherwise heuristic)
  - Growth proxy (simple based on stored snapshots)
- “AutoBet” recommendation engine:
  - budget rules (min/max)
  - discount target vs market average (default 30–50%)
  - condition risk (Good/Dirty/Unknown)

## Tech stack
- Next.js (App Router) + TypeScript
- Prisma + SQLite (local dev) for scans + price snapshots
- Tesseract.js (OCR in browser)

## Getting started

### 1) Install
```bash
npm install
```

### 2) Environment
Copy:
```bash
cp .env.example .env
```

### 3) Database
```bash
npx prisma migrate dev
```

### 4) Run
```bash
npm run dev
```

Open http://localhost:3000

## Roadmap (from notes)
- Add seller evaluation & live signals (Whatnot): #people live, auction type, time-to-end
- Add proper eBay + Cardmarket integration (official APIs / legal access)
- Add “record” mode for refunds/returns evidence
- Add user accounts + subscription / one-shot scan packs
- Add report export (PDF) + share links

## Legal & compliance
Scraping marketplaces can violate ToS. Prefer official APIs or written permission. Respect rate limits and privacy.

---

Made for your GitHub repo: **tcg-scan-bot**.
