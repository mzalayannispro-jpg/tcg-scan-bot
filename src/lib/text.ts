export function normalizeOCR(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
}

/**
 * Very small heuristic: try to guess the game from OCR text.
 */
export function guessGame(text: string): "pokemon" | "mtg" | "unknown" {
  const t = text.toLowerCase();
  if (t.includes("pokemon") || t.includes("pokémon") || t.includes("hp") || t.includes("trainer")) return "pokemon";
  if (t.includes("creature") || t.includes("instant") || t.includes("sorcery") || t.includes("planeswalker")) return "mtg";
  return "unknown";
}
