import { NextResponse } from "next/server";
import { hasValidAdminSession } from "../../../../admin-auth";
import { database, ensureSchema } from "../../../../db";

export async function POST(request: Request) {
  if (!await hasValidAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { roundId } = await request.json() as { roundId?: string };
  if (!roundId) return NextResponse.json({ error: "Round is required." }, { status: 400 });
  await ensureSchema();
  const db = database();
  const round = await db.prepare("SELECT correct_door FROM rounds WHERE id = ? AND status = 'voting'").bind(roundId).first<{ correct_door: number }>();
  if (!round) return NextResponse.json({ error: "Round is not open for reveal." }, { status: 409 });
  const winners = await db.prepare("SELECT user_id FROM votes WHERE round_id = ? AND door = ?").bind(roundId, round.correct_door).all<{ user_id: string }>();
  await db.batch([
    db.prepare("UPDATE rounds SET status = 'revealed', reveal_at = CURRENT_TIMESTAMP WHERE id = ?").bind(roundId),
    db.prepare("UPDATE votes SET result = CASE WHEN door = ? THEN 'correct' ELSE 'wrong' END WHERE round_id = ?").bind(round.correct_door, roundId),
    ...winners.results.map((winner) => db.prepare("UPDATE users SET points = points + 10 WHERE id = ?").bind(winner.user_id)),
  ]);
  return NextResponse.json({ ok: true, winners: winners.results.length });
}
