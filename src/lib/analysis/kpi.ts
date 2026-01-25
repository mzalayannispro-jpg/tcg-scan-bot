import { KPIs, MarketQuote } from "@/lib/types";

export function computeKPIs(quotes: MarketQuote[], historicalAvgs: number[] = []): KPIs {
  const avgs = quotes.map(q => q.avg).filter((x): x is number => typeof x === "number");
  const lows = quotes.map(q => q.low).filter((x): x is number => typeof x === "number");
  const highs = quotes.map(q => q.high).filter((x): x is number => typeof x === "number");
  const volumes = quotes.map(q => q.volume).filter((x): x is number => typeof x === "number");

  const avgPrice = avgs.length ? mean(avgs) : undefined;
  const lowPrice = lows.length ? Math.min(...lows) : undefined;
  const highPrice = highs.length ? Math.max(...highs) : undefined;

  // Liquidity proxy: normalize volume-ish
  const liquidity = volumes.length ? clamp01(mean(volumes) / 120) * 100 : undefined;

  // Rarity proxy: lower liquidity => higher rarity (very rough)
  const rarity = liquidity !== undefined ? (100 - liquidity) : undefined;

  // Growth proxy from historical averages
  const growth = growthFromHistory(historicalAvgs);

  return { avgPrice, lowPrice, highPrice, liquidity, rarity, growth };
}

function mean(xs: number[]) { return xs.reduce((a,b)=>a+b,0) / xs.length; }
function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }

function growthFromHistory(history: number[]): number | undefined {
  if (history.length < 2) return undefined;
  const first = history[0];
  const last = history[history.length - 1];
  if (!isFinite(first) || first <= 0) return undefined;
  return ((last - first) / first) * 100;
}
