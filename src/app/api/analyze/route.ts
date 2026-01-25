import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getMarketQuotes } from "@/lib/providers/market";
import { computeKPIs } from "@/lib/analysis/kpi";
import { recommend } from "@/lib/analysis/recommend";

const Body = z.object({
  game: z.enum(["pokemon","mtg","unknown"]),
  card: z.object({
    id: z.string(),
    name: z.string(),
    source: z.string(),
    set: z.string().optional(),
    number: z.string().optional(),
    image: z.string().optional(),
    confidence: z.number().optional(),
  }),
  rules: z.object({
    targetDiscount: z.number().min(0).max(0.9),
    maxBudget: z.number().optional(),
    condition: z.enum(["good","dirty","unknown"]),
  })
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());

  // Create scan record (minimal)
  const scan = await prisma.scan.create({
    data: {
      rawText: body.card.name,
      game: body.game,
      resolvedCard: body.card.id,
      resolvedName: body.card.name,
      confidence: body.card.confidence ?? null,
      imageName: body.card.image ?? null,
    },
  });

  const quotes = await getMarketQuotes(body.game, body.card.id, body.card.name);

  // Store snapshots
  await prisma.priceSnapshot.createMany({
    data: quotes.map((q) => ({
      scanId: scan.id,
      provider: q.provider,
      currency: q.currency,
      avg: q.avg ?? null,
      low: q.low ?? null,
      high: q.high ?? null,
      volume: q.volume ?? null,
    })),
  });

  // Pull limited history for growth proxy
  const history = await prisma.priceSnapshot.findMany({
    where: { scanId: scan.id, avg: { not: null } },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { avg: true },
  });
  const histAvgs = history.map(h => h.avg!).filter(Boolean);

  const kpi = computeKPIs(quotes, histAvgs);
  const recommendation = recommend(kpi, body.rules);

  return NextResponse.json({ scanId: scan.id, quotes, kpi, recommendation });
}
