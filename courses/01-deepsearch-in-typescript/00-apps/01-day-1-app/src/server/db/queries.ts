import { and, eq, gte, sql, asc, desc } from "drizzle-orm";
import { db } from "./index";
import { users, userRequests, chats, messages } from "./schema";
import type { Message } from "ai";

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

export async function upsertChat(opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}) {
  const { userId, chatId, title, messages: messageList } = opts;

  // First, check if chat exists and belongs to user
  const existingChat = await db
    .select({ id: chats.id, userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (existingChat.length > 0 && existingChat[0]!.userId !== userId) {
    throw new Error("Chat does not belong to the logged in user");
  }

  // Use a transaction to ensure atomicity
  return await db.transaction(async (tx) => {
    // Upsert the chat
    if (existingChat.length > 0) {
      // Update existing chat
      await tx
        .update(chats)
        .set({ 
          title, 
          updatedAt: sql`CURRENT_TIMESTAMP` 
        })
        .where(eq(chats.id, chatId));

      // Delete all existing messages for this chat
      await tx.delete(messages).where(eq(messages.chatId, chatId));
    } else {
      // Create new chat
      await tx.insert(chats).values({
        id: chatId,
        userId,
        title,
      });
    }

    // Insert new messages
    if (messageList.length > 0) {
      const messageValues = messageList.map((message, index) => ({
        chatId,
        role: message.role,
        parts: message.content as unknown as any, // Store the content as JSON
        order: index,
      }));

      await tx.insert(messages).values(messageValues);
    }

    return { chatId, userId, title };
  });
}

export async function getChat(chatId: string, userId: string) {
  // Verify chat belongs to user and get chat with messages
  const chatData = await db
    .select({
      id: chats.id,
      userId: chats.userId,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  if (chatData.length === 0) {
    return null;
  }

  // Get messages for the chat
  const chatMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      parts: messages.parts,
      order: messages.order,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.order));

  // Convert to AI Message format
  const formattedMessages: Message[] = chatMessages.map((msg) => ({
    id: msg.id,
    // msg.role is typed as string, so we
    // need to cast it to the correct type
    role: msg.role as "user" | "assistant",
    // msg.parts is typed as unknown[], so we
    // need to cast it to the correct type
    parts: msg.parts as Message["parts"],
    // content is not persisted, so we can
    // safely pass an empty string, because
    // parts are always present, and the AI SDK
    // will use the parts to construct the content
    content: "",
  }));

  return {
    ...chatData[0]!,
    messages: formattedMessages,
  };
}

export async function getChats(userId: string) {
  // Get all chats for user, ordered by most recent first
  return await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
}

export async function deleteChat(chatId: string, userId: string) {
  // First verify the chat exists and belongs to the user
  const existingChat = await db
    .select({ id: chats.id, userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (existingChat.length === 0) {
    throw new Error("Chat not found");
  }

  if (existingChat[0]!.userId !== userId) {
    throw new Error("Chat does not belong to the logged in user");
  }

  // Delete the chat (messages will be deleted automatically due to cascade)
  await db.delete(chats).where(eq(chats.id, chatId));

  return { success: true };
} 