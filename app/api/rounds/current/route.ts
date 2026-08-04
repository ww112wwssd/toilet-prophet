import { NextResponse } from "next/server";
import { database, ensureSchema } from "../../../db";

export async function GET() {
  await ensureSchema();
  const round = await database().prepare("SELECT id, episode_no, title, clue, voting_ends_at, status, CASE WHEN status = 'revealed' THEN correct_door ELSE NULL END AS correct_door FROM rounds WHERE status IN ('voting', 'waiting', 'revealed') ORDER BY episode_no DESC LIMIT 1").first<any>();
  if (!round) return NextResponse.json({ round: null, distribution: [0, 0, 0], totalVotes: 0 });
  const rows = await database().prepare("SELECT door, COUNT(*) AS count FROM votes WHERE round_id = ? GROUP BY door").bind(round.id).all<{ door: number; count: number }>();
  const counts = [1, 2, 3].map((door) => Number(rows.results.find((row) => row.door === door)?.count ?? 0));
  const totalVotes = counts.reduce((sum, count) => sum + count, 0);
  const distribution = totalVotes ? counts.map((count) => Math.round((count / totalVotes) * 100)) : [0, 0, 0];
  return NextResponse.json({ round, distribution, totalVotes });
}
