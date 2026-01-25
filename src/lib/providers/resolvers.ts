import { CardCandidate, Game } from "@/lib/types";

export async function resolveCandidates(game: Game, rawText: string): Promise<CardCandidate[]> {
  const q = extractQuery(rawText);
  if (!q) return [];

  if (game === "pokemon") return resolvePokemon(q);
  if (game === "mtg") return resolveMtg(q);

  // try both for unknown
  const [p, m] = await Promise.allSettled([resolvePokemon(q), resolveMtg(q)]);
  const res: CardCandidate[] = [];
  if (p.status === "fulfilled") res.push(...p.value);
  if (m.status === "fulfilled") res.push(...m.value);
  return res.sort((a,b)=>b.confidence-a.confidence).slice(0, 8);
}

function extractQuery(text: string): string | null {
  // Take the first 6-10 words, remove obvious noise
  const cleaned = text
    .replace(/[^a-zA-Z0-9\s'’-]/g, " ")
    .replace(/\b(near|mint|nm|lp|mp|hp|damaged|foil|reverse|holo|ex|gx|vmax|vstar)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length === 0) return null;
  return words.slice(0, 10).join(" ");
}

async function resolvePokemon(q: string): Promise<CardCandidate[]> {
  // Pokémon TCG API v2: https://pokemontcg.io/
  const url = new URL("https://api.pokemontcg.io/v2/cards");
  // Search by name; the API uses a Lucene-like syntax.
  url.searchParams.set("q", `name:${escapeLucene(q)}`);
  url.searchParams.set("pageSize", "8");
  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) return [];
  const data = await r.json() as any;
  const cards = (data.data ?? []) as any[];
  return cards.map((c) => ({
    id: c.id,
    name: c.name,
    set: c.set?.name,
    number: c.number,
    image: c.images?.small ?? c.images?.large,
    source: "pokemon-tcg",
    confidence: 0.6,
  }));
}

async function resolveMtg(q: string): Promise<CardCandidate[]> {
  // Scryfall: https://scryfall.com/docs/api
  const url = new URL("https://api.scryfall.com/cards/search");
  url.searchParams.set("q", q);
  url.searchParams.set("unique", "cards");
  url.searchParams.set("order", "relevance");
  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) return [];
  const data = await r.json() as any;
  const cards = (data.data ?? []) as any[];
  return cards.slice(0, 8).map((c) => ({
    id: c.id,
    name: c.name,
    set: c.set_name,
    number: c.collector_number,
    image: c.image_uris?.small ?? c.card_faces?.[0]?.image_uris?.small,
    source: "scryfall",
    confidence: 0.6,
  }));
}

function escapeLucene(s: string): string {
  return s.replace(/([+\-!(){}\[\]^"~*?:\\/])/g, "\\$1");
}
