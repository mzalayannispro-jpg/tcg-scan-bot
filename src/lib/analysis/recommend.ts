import { KPIs, Recommendation } from "@/lib/types";

export type AutoBetRules = {
  targetDiscount: number;  // 0.30 .. 0.50 typical
  maxBudget?: number;      // hard cap
  condition: "good" | "dirty" | "unknown";
};

export function recommend(kpi: KPIs, rules: AutoBetRules): Recommendation {
  const notes: string[] = [];
  const avg = kpi.avgPrice;

  if (!avg) {
    return { verdict: "watch", notes: ["No reliable market average yet. Try manual selection or add providers."] };
  }

  const discount = rules.targetDiscount;
  const target = avg * (1 - discount);

  let riskPenalty = 1.0;
  if (rules.condition === "dirty") {
    notes.push("Condition marked DIRTY ➜ applying risk penalty.");
    riskPenalty = 0.85;
  } else if (rules.condition === "unknown") {
    notes.push("Condition unknown ➜ applying small risk penalty.");
    riskPenalty = 0.92;
  }

  let maxBid = target * riskPenalty;

  if (rules.maxBudget !== undefined) {
    maxBid = Math.min(maxBid, rules.maxBudget);
    notes.push(`Budget cap applied: ${rules.maxBudget.toFixed(2)}`);
  }

  // Verdict heuristic
  const liquidity = kpi.liquidity ?? 50;
  if (maxBid < avg * 0.5) notes.push("Strict discount target (>=50%) — fewer wins but higher ROI.");
  if (liquidity < 25) notes.push("Low liquidity — expect fewer opportunities, be patient.");

  const verdict: Recommendation["verdict"] =
    maxBid >= avg * 0.7 ? "buy" :
    maxBid >= avg * 0.55 ? "watch" : "skip";

  return {
    verdict,
    maxBid: round2(maxBid),
    targetDiscount: discount,
    notes,
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
