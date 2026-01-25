export type Game = "pokemon" | "mtg" | "unknown";

export type CardCandidate = {
  id: string;
  name: string;
  set?: string;
  number?: string;
  image?: string;
  source: "pokemon-tcg" | "scryfall" | "manual";
  confidence: number; // 0..1 heuristic
};

export type MarketQuote = {
  provider: string;
  currency: string;
  avg?: number;
  low?: number;
  high?: number;
  volume?: number;
  url?: string;
};

export type KPIs = {
  avgPrice?: number;
  lowPrice?: number;
  highPrice?: number;
  liquidity?: number; // 0..100
  rarity?: number;    // 0..100
  growth?: number;    // -100..+100 (% proxy)
};

export type Recommendation = {
  verdict: "buy" | "watch" | "skip";
  maxBid?: number;
  targetDiscount?: number; // e.g. 0.3 means 30%
  notes: string[];
};
