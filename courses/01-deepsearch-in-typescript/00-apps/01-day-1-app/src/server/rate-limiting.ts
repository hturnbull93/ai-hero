import { getUserById, getTodayRequestCount, createUserRequest } from "./db/queries";

export const DAILY_REQUEST_LIMIT = 50;

export async function checkRateLimit(userId: string): Promise<boolean> {
  // Get user info to check if admin
  const user = await getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // If user is admin, bypass rate limit
  if (user.isAdmin) {
    return true;
  }

  // Count requests made today for regular users
  const requestCount = await getTodayRequestCount(userId);
  return requestCount < DAILY_REQUEST_LIMIT;
}

export async function recordRequest(userId: string): Promise<void> {
  await createUserRequest(userId);
} 