import { NextResponse } from "next/server";
import { database, ensureSchema } from "../../db";

export async function GET() {
  await ensureSchema();
  const users = await database().prepare("SELECT id, nickname, avatar_url, points, streak FROM users WHERE status = 'active' ORDER BY points DESC, created_at ASC LIMIT 100").all();
  return NextResponse.json({ users: users.results });
}
