import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "./index";
import { users, userRequests } from "./schema";

export async function getUserById(userId: string) {
  const user = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user[0] ?? null;
}

export async function getTodayRequestCount(userId: string) {
  // Get today's start (midnight UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(userRequests)
    .where(
      and(
        eq(userRequests.userId, userId),
        gte(userRequests.createdAt, today)
      )
    );

  return result[0]?.count ?? 0;
}

export async function createUserRequest(userId: string) {
  return await db.insert(userRequests).values({
    userId,
  });
} 