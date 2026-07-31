import { NextResponse } from "next/server";
import { hasValidAdminSession } from "../../../admin-auth";
import { database, ensureSchema, id } from "../../../db";

export async function GET() {
  if (!await hasValidAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const prizes = await database().prepare("SELECT * FROM prizes ORDER BY created_at DESC").all();
  return NextResponse.json({ prizes: prizes.results });
}

export async function POST(request: Request) {
  if (!await hasValidAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { name?: string; description?: string; rarity?: string; stock?: number; weight?: number };
  if (!body.name?.trim()) return NextResponse.json({ error: "Prize name is required." }, { status: 400 });
  await ensureSchema();
  const prize = { id: id("prize"), name: body.name.trim(), description: body.description?.trim() || "", rarity: body.rarity || "common", stock: Math.max(0, Number(body.stock) || 0), weight: Math.max(1, Number(body.weight) || 1) };
  await database().prepare("INSERT INTO prizes (id, name, description, rarity, stock, weight) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(prize.id, prize.name, prize.description, prize.rarity, prize.stock, prize.weight).run();
  return NextResponse.json(prize, { status: 201 });
}
