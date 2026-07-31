import { NextResponse } from "next/server";
import { hasValidAdminSession } from "../../../admin-auth";
import { database, ensureSchema } from "../../../db";

export async function GET() {
  if (!await hasValidAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const users = await database().prepare(
    "SELECT users.id, users.nickname, users.avatar_url, users.points, users.streak, users.status, users.created_at, COUNT(DISTINCT votes.id) AS vote_count, COUNT(DISTINCT awards.id) AS award_count FROM users LEFT JOIN votes ON votes.user_id = users.id LEFT JOIN awards ON awards.user_id = users.id GROUP BY users.id ORDER BY users.points DESC, users.created_at ASC",
  ).all();
  return NextResponse.json({ users: users.results });
}

export async function PATCH(request: Request) {
  if (!await hasValidAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { id?: string; points?: number; status?: "active" | "disabled" };
  if (!body.id) return NextResponse.json({ error: "User id is required." }, { status: 400 });
  if (body.status && !["active", "disabled"].includes(body.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  await ensureSchema();
  const points = Number.isFinite(body.points) ? Math.max(0, Math.floor(Number(body.points))) : null;
  if (points === null && !body.status) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  await database().prepare("UPDATE users SET points = COALESCE(?, points), status = COALESCE(?, status) WHERE id = ?")
    .bind(points, body.status ?? null, body.id).run();
  return NextResponse.json({ ok: true });
}
