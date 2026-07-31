import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull(),
  avatarUrl: text("avatar_url").notNull().default("default"),
  points: integer("points").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const rounds = sqliteTable("rounds", {
  id: text("id").primaryKey(),
  episodeNo: integer("episode_no").notNull(),
  title: text("title").notNull(),
  clue: text("clue").notNull().default(""),
  correctDoor: integer("correct_door"),
  votingEndsAt: text("voting_ends_at").notNull(),
  revealAt: text("reveal_at"),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("rounds_episode_no_idx").on(table.episodeNo)]);

export const votes = sqliteTable("votes", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull().references(() => rounds.id),
  userId: text("user_id").notNull().references(() => users.id),
  door: integer("door").notNull(),
  result: text("result").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("votes_round_user_idx").on(table.roundId, table.userId)]);

export const prizes = sqliteTable("prizes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  rarity: text("rarity").notNull().default("common"),
  stock: integer("stock").notNull().default(0),
  weight: integer("weight").notNull().default(1),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const awards = sqliteTable("awards", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull().references(() => rounds.id),
  userId: text("user_id").notNull().references(() => users.id),
  prizeId: text("prize_id").notNull().references(() => prizes.id),
  status: text("status").notNull().default("stored"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adminLogs = sqliteTable("admin_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
