import { NextResponse } from "next/server";
import { hasValidAdminSession } from "../../../admin-auth";
import { database, ensureSchema, id } from "../../../db";

async function authorize() {
  return hasValidAdminSession();
}

export async function GET() {
  if (!await authorize()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const rounds = await database().prepare("SELECT * FROM rounds ORDER BY episode_no DESC").all();
  return NextResponse.json({ rounds: rounds.results });
}

export async function POST(request: Request) {
  if (!await authorize()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { title?: string; clue?: string; correctDoor?: number; votingEndsAt?: string; revealAt?: string };
  if (!body.title?.trim() || ![1, 2, 3].includes(Number(body.correctDoor)) || !body.votingEndsAt) {
    return NextResponse.json({ error: "Missing round fields." }, { status: 400 });
  }
  await ensureSchema();
  const db = database();
  const current = await db.prepare("SELECT id FROM rounds WHERE status = 'voting' LIMIT 1").first();
  if (current) return NextResponse.json({ error: "Finish the active round first." }, { status: 409 });
  const row = await db.prepare("SELECT MAX(episode_no) AS max_episode FROM rounds").first<{ max_episode: number | null }>();
  const round = { id: id("round"), episode: (row?.max_episode ?? 0) + 1 };
  await db.prepare("INSERT INTO rounds (id, episode_no, title, clue, correct_door, voting_ends_at, reveal_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'voting')")
    .bind(round.id, round.episode, body.title.trim(), body.clue?.trim() || "", body.correctDoor, body.votingEndsAt, body.revealAt || null).run();
  return NextResponse.json({ ...round, status: "voting" }, { status: 201 });
}
