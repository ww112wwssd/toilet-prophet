import { NextResponse } from "next/server";
import { database, ensureSchema, id } from "../../db";

export async function POST(request: Request) {
  const body = await request.json() as { userId?: string; roundId?: string; door?: number };
  if (!body.userId || !body.roundId || ![1, 2, 3].includes(Number(body.door))) return NextResponse.json({ error: "Invalid vote." }, { status: 400 });
  await ensureSchema();
  const db = database();
  const round = await db.prepare("SELECT id FROM rounds WHERE id = ? AND status = 'voting'").bind(body.roundId).first();
  if (!round) return NextResponse.json({ error: "Voting is closed." }, { status: 409 });
  try {
    await db.batch([
      db.prepare("INSERT INTO votes (id, round_id, user_id, door) VALUES (?, ?, ?, ?)").bind(id("vote"), body.roundId, body.userId, body.door),
      db.prepare("UPDATE users SET points = points + 1 WHERE id = ? AND status = 'active'").bind(body.userId),
    ]);
  } catch {
    return NextResponse.json({ error: "You have already voted this round." }, { status: 409 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
