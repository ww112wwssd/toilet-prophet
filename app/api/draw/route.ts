import { NextResponse } from "next/server";
import { database, ensureSchema, id } from "../../db";

export async function POST(request: Request) {
  const { userId, roundId } = await request.json() as { userId?: string; roundId?: string };
  if (!userId || !roundId) return NextResponse.json({ error: "User and round are required." }, { status: 400 });
  await ensureSchema();
  const db = database();
  const vote = await db.prepare("SELECT votes.result FROM votes JOIN rounds ON rounds.id = votes.round_id WHERE votes.user_id = ? AND votes.round_id = ? AND rounds.status = 'revealed'").bind(userId, roundId).first<{ result: string }>();
  if (vote?.result !== "correct") return NextResponse.json({ error: "Only correct votes can draw." }, { status: 403 });
  const existing = await db.prepare("SELECT id FROM awards WHERE user_id = ? AND round_id = ?").bind(userId, roundId).first();
  if (existing) return NextResponse.json({ error: "This round has already been drawn." }, { status: 409 });
  const candidates = await db.prepare("SELECT id, name, rarity, stock, weight FROM prizes WHERE status = 'active' AND stock > 0 ORDER BY RANDOM() LIMIT 20").all<{ id: string; name: string; rarity: string; stock: number; weight: number }>();
  if (!candidates.results.length) return NextResponse.json({ error: "No prizes are available." }, { status: 409 });
  const total = candidates.results.reduce((sum, prize) => sum + Math.max(1, prize.weight), 0);
  let cursor = Math.random() * total;
  const prize = candidates.results.find((item) => (cursor -= Math.max(1, item.weight)) <= 0) ?? candidates.results[0];
  await db.batch([
    db.prepare("INSERT INTO awards (id, round_id, user_id, prize_id) VALUES (?, ?, ?, ?)").bind(id("award"), roundId, userId, prize.id),
    db.prepare("UPDATE prizes SET stock = stock - 1 WHERE id = ? AND stock > 0").bind(prize.id),
  ]);
  return NextResponse.json({ prize: { name: prize.name, rarity: prize.rarity } }, { status: 201 });
}
