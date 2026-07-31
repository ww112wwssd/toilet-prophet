import { NextResponse } from "next/server";
import { database, ensureSchema } from "../../../db";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await ensureSchema();
  const db = database();
  const [user, votes, awards] = await Promise.all([
    db.prepare("SELECT id, nickname, avatar_url, points, streak FROM users WHERE id = ?").bind(id).first(),
    db.prepare("SELECT rounds.episode_no, rounds.title, votes.door, votes.result FROM votes JOIN rounds ON rounds.id = votes.round_id WHERE votes.user_id = ? ORDER BY votes.created_at DESC").bind(id).all(),
    db.prepare("SELECT awards.status, prizes.name, prizes.rarity FROM awards JOIN prizes ON prizes.id = awards.prize_id WHERE awards.user_id = ? ORDER BY awards.created_at DESC").bind(id).all(),
  ]);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ user, votes: votes.results, awards: awards.results });
}
