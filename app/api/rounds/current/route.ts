import { NextResponse } from "next/server";
import { database, ensureSchema } from "../../../db";

export async function GET() {
  await ensureSchema();
  const round = await database().prepare("SELECT id, episode_no, title, clue, voting_ends_at, status FROM rounds WHERE status IN ('voting', 'waiting', 'revealed') ORDER BY episode_no DESC LIMIT 1").first();
  return NextResponse.json({ round });
}
