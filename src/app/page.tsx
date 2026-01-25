'use client';

import { useMemo, useState } from "react";
import Tesseract from "tesseract.js";
import type { CardCandidate, Game, KPIs, MarketQuote, Recommendation } from "@/lib/types";
import { guessGame, normalizeOCR } from "@/lib/text";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [game, setGame] = useState<Game>("unknown");
  const [loadingOCR, setLoadingOCR] = useState(false);

  const [candidates, setCandidates] = useState<CardCandidate[]>([]);
  const [selected, setSelected] = useState<CardCandidate | null>(null);

  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [kpi, setKpi] = useState<KPIs | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);

  const [condition, setCondition] = useState<"good"|"dirty"|"unknown">("unknown");
  const [discount, setDiscount] = useState<number>(0.4);
  const [budget, setBudget] = useState<string>("");

  const canAnalyze = selected !== null;

  const pickedGame = useMemo(() => game, [game]);

  async function runOCR() {
    if (!file) return;
    setLoadingOCR(true);
    setOcrText("");
    setCandidates([]);
    setSelected(null);
    setQuotes([]);
    setKpi(null);
    setRec(null);

    const url = URL.createObjectURL(file);
    setImgUrl(url);

    const result = await Tesseract.recognize(url, "eng");
    const text = normalizeOCR(result.data.text || "");
    setOcrText(text);

    const g = guessGame(text);
    setGame(g);

    // resolve candidates
    const r = await fetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: g, text }),
    });
    const data = await r.json();
    setCandidates(data.candidates || []);
    setLoadingOCR(false);
  }

  async function analyze() {
    if (!selected) return;

    const maxBudget = budget.trim() ? Number(budget) : undefined;

    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game: pickedGame,
        card: selected,
        rules: { condition, targetDiscount: discount, maxBudget }
      }),
    });
    const data = await r.json();
    setQuotes(data.quotes || []);
    setKpi(data.kpi || null);
    setRec(data.recommendation || null);
  }

  return (
    <main className="container">
      <h1 style={{marginTop:0}}>TCG Scan Bot</h1>
      <p className="small">Scan ➜ Identify ➜ Collect ➜ Analyze ➜ KPIs ➜ AutoBet recommendation</p>

      <div className="card">
        <div className="row" style={{alignItems:"center"}}>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              setImgUrl(null);
            }}
          />
          <button className="btn" onClick={runOCR} disabled={!file || loadingOCR}>
            {loadingOCR ? "OCR…" : "Run OCR"}
          </button>
          <span className="badge">Game: {game}</span>
        </div>

        {imgUrl && (
          <div style={{marginTop: 12}}>
            <img src={imgUrl} alt="upload" style={{maxWidth:"100%", borderRadius: 12, border:"1px solid #232327"}} />
          </div>
        )}

        <hr />

        <h3 style={{margin:"0 0 8px 0"}}>OCR Text</h3>
        <div className="mono card" style={{background:"#0f0f11"}}>{ocrText || "(empty)"}</div>

        <hr />

        <h3 style={{margin:"0 0 8px 0"}}>Candidates</h3>
        <div className="row">
          {candidates.map((c) => (
            <button
              key={c.id}
              className="card"
              style={{
                width: 220,
                cursor: "pointer",
                outline: selected?.id === c.id ? "2px solid #f3f3f3" : "none",
              }}
              onClick={() => setSelected(c)}
            >
              <div style={{display:"flex", gap:10}}>
                {c.image && <img src={c.image} alt={c.name} style={{width:60, height:"auto", borderRadius:8}} />}
                <div style={{textAlign:"left"}}>
                  <div style={{fontWeight:700}}>{c.name}</div>
                  <div className="small">{c.set} #{c.number}</div>
                  <div className="small">{c.source}</div>
                </div>
              </div>
            </button>
          ))}
          {candidates.length === 0 && <div className="small">No candidates yet. Try a clearer screenshot.</div>}
        </div>

        <hr />

        <h3 style={{margin:"0 0 8px 0"}}>AutoBet settings</h3>
        <div className="row" style={{alignItems:"center"}}>
          <label className="small">Condition</label>
          <select value={condition} onChange={(e)=>setCondition(e.target.value as any)}>
            <option value="good">Good</option>
            <option value="unknown">Unknown</option>
            <option value="dirty">Dirty</option>
          </select>

          <label className="small">Target discount</label>
          <input className="input" type="number" step="0.05" min="0" max="0.9" value={discount}
                 onChange={(e)=>setDiscount(Number(e.target.value))} />

          <label className="small">Max budget (optional)</label>
          <input className="input" type="number" step="0.5" value={budget} onChange={(e)=>setBudget(e.target.value)} />
        </div>

        <div style={{marginTop: 12}}>
          <button className="btn" onClick={analyze} disabled={!canAnalyze}>Analyze & Recommend</button>
        </div>
      </div>

      {(quotes.length > 0 || kpi || rec) && (
        <div className="card" style={{marginTop: 16}}>
          <h2 style={{marginTop:0}}>Report</h2>

          {kpi && (
            <>
              <h3>KPIs</h3>
              <div className="row">
                <span className="badge">Avg: {fmt(kpi.avgPrice)}</span>
                <span className="badge">Low: {fmt(kpi.lowPrice)}</span>
                <span className="badge">High: {fmt(kpi.highPrice)}</span>
                <span className="badge">Liquidity: {fmtPct(kpi.liquidity)}</span>
                <span className="badge">Rarity: {fmtPct(kpi.rarity)}</span>
                <span className="badge">Growth: {fmtPct(kpi.growth)}</span>
              </div>
            </>
          )}

          <hr />

          <h3>Market quotes</h3>
          <div className="row">
            {quotes.map((q) => (
              <div key={q.provider} className="card" style={{width: 240}}>
                <div style={{fontWeight:700}}>{q.provider}</div>
                <div className="small">Avg: {fmt(q.avg)} {q.currency}</div>
                <div className="small">Low: {fmt(q.low)} / High: {fmt(q.high)}</div>
                <div className="small">Volume: {q.volume ?? "—"}</div>
              </div>
            ))}
          </div>

          <hr />

          {rec && (
            <>
              <h3>Recommendation</h3>
              <div className="row" style={{alignItems:"center"}}>
                <span className="badge">Verdict: {rec.verdict.toUpperCase()}</span>
                <span className="badge">Max bid: {fmt(rec.maxBid)}</span>
                <span className="badge">Discount: {rec.targetDiscount ? Math.round(rec.targetDiscount*100) + "%" : "—"}</span>
              </div>
              <ul className="small">
                {rec.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      <p className="small" style={{marginTop: 18}}>
        Note: eBay/Cardmarket/Whatnot quotes are stubs in this MVP. Plug official APIs to go live.
      </p>
    </main>
  );
}

function fmt(x?: number) {
  if (typeof x !== "number" || !isFinite(x)) return "—";
  return x.toFixed(2);
}
function fmtPct(x?: number) {
  if (typeof x !== "number" || !isFinite(x)) return "—";
  return (Math.round(x * 10) / 10).toFixed(1) + "%";
}
