import { NextResponse } from "next/server";
import { database, ensureSchema, id } from "../../db";

export async function POST(request: Request) {
  const body = await request.json() as { nickname?: string; avatarUrl?: string };
  const nickname = body.nickname?.trim().slice(0, 16);
  if (!nickname) return NextResponse.json({ error: "Nickname is required." }, { status: 400 });
  await ensureSchema();
  const user = { id: id("user"), nickname, avatarUrl: body.avatarUrl?.slice(0, 200_000) || "default" };
  await database().prepare("INSERT INTO users (id, nickname, avatar_url) VALUES (?, ?, ?)").bind(user.id, user.nickname, user.avatarUrl).run();
  return NextResponse.json({ ...user, points: 0, streak: 0 }, { status: 201 });
}
