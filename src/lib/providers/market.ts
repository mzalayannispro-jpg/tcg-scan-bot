import { Game, MarketQuote } from "@/lib/types";

/**
 * Provider interface: each returns an optional quote.
 * - For eBay/Cardmarket/Whatnot we ship a stub that you can replace with real API calls.
 */
export async function getMarketQuotes(game: Game, cardId: string, cardName: string): Promise<MarketQuote[]> {
  const quotes: MarketQuote[] = [];

  if (game === "pokemon") {
    const poke = await pokemonTcgPricing(cardId);
    if (poke) quotes.push(poke);
  }

  if (game === "mtg") {
    const scry = await scryfallPricing(cardId);
    if (scry) quotes.push(scry);
  }

  // Stubs (architecture-ready)
  quotes.push(await stubProvider("ebay", cardName));
  quotes.push(await stubProvider("cardmarket", cardName));
  quotes.push(await stubProvider("whatnot", cardName));

  return quotes.filter(Boolean) as MarketQuote[];
}

async function pokemonTcgPricing(cardId: string): Promise<MarketQuote | null> {
  const url = `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(cardId)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const data = await r.json() as any;
  const c = data.data;
  const p = c?.tcgplayer?.prices;
  if (!p) return null;

  // Pick a representative price field (market) if available.
  const markets: number[] = [];
  for (const k of Object.keys(p)) {
    const entry = p[k];
    if (entry?.market) markets.push(Number(entry.market));
  }
  const avg = markets.length ? markets.reduce((a,b)=>a+b,0)/markets.length : undefined;

  return {
    provider: "pokemon-tcg/tcgplayer",
    currency: "USD",
    avg,
    low: undefined,
    high: undefined,
    volume: undefined,
    url: c?.tcgplayer?.url,
  };
}

async function scryfallPricing(cardId: string): Promise<MarketQuote | null> {
  const url = `https://api.scryfall.com/cards/${encodeURIComponent(cardId)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const c = await r.json() as any;
  const usd = c?.prices?.usd ? Number(c.prices.usd) : undefined;
  const usdFoil = c?.prices?.usd_foil ? Number(c.prices.usd_foil) : undefined;
  const values = [usd, usdFoil].filter((x) => typeof x === "number") as number[];
  const avg = values.length ? values.reduce((a,b)=>a+b,0)/values.length : undefined;

  return {
    provider: "scryfall",
    currency: "USD",
    avg,
    low: undefined,
    high: undefined,
    volume: c?.edhrec_rank ? 1000 - Math.min(1000, Number(c.edhrec_rank)) : undefined, // NOT volume; just a proxy
    url: c?.scryfall_uri,
  };
}

async function stubProvider(provider: string, cardName: string): Promise<MarketQuote> {
  // Deterministic pseudo-random based on name
  const seed = hash(cardName + provider);
  const base = (seed % 2000) / 100; // 0..20
  const avg = Math.max(0.5, base);
  const low = Math.max(0.25, avg * 0.8);
  const high = avg * 1.25;
  return {
    provider,
    currency: "USD",
    avg: round2(avg),
    low: round2(low),
    high: round2(high),
    volume: (seed % 120) + 1,
    url: undefined,
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
