import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCandidates } from "@/lib/providers/resolvers";
import type { Game } from "@/lib/types";

const Body = z.object({
  game: z.enum(["pokemon","mtg","unknown"]),
  text: z.string().min(1),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const candidates = await resolveCandidates(body.game as Game, body.text);
  return NextResponse.json({ candidates });
}
