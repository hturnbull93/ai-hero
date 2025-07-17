import type { Message } from "ai";
import {
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { checkRateLimit, recordRequest } from "~/server/rate-limiting";
import { upsertChat } from "~/server/db/queries";
import { streamFromDeepSearch } from "~/deep-search";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

export const maxDuration = 60;

export async function POST(request: Request) {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check rate limit
  const isAllowed = await checkRateLimit(session.user.id);

  if (!isAllowed) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  // Record the request (for both regular users and admins)
  await recordRequest(session.user.id);

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId: string;
    isNewChat: boolean;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages, chatId, isNewChat } = body;

      // Create Langfuse trace with user data
      const trace = langfuse.trace({
        name: "chat",
        userId: session.user.id,
      });

      // If this is a new chat, send the chat ID to the frontend
      if (isNewChat) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId,
        });
      }

      // Create/update chat before streaming starts to protect against broken streams
      // Generate a title from the first user message (take first 50 chars)
      const firstUserMessage = messages.find((m) => m.role === "user");
      const title =
        typeof firstUserMessage?.content === "string"
          ? firstUserMessage.content.slice(0, 50)
          : "New Chat";

      // Save the current messages to the database before starting the stream
      // The original messages have content as strings, which is what upsertChat expects
      const upsertChatSpan = trace.span({
        name: "upsert-chat-before-stream",
        input: {
          userId: session.user.id,
          chatId,
          title,
          messageCount: messages.length,
        },
      });

      const upsertResult = await upsertChat({
        userId: session.user.id,
        chatId,
        title,
        messages,
      });

      upsertChatSpan.end({
        output: upsertResult,
      });

      // Update trace with sessionId now that we have the chatId
      trace.update({
        sessionId: chatId,
      });

      const result = streamFromDeepSearch({
        messages,
        telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        onFinish: async ({ response }) => {
          try {
            const responseMessages = response.messages;
            
            // Merge the original messages with the AI's response messages
            const updatedMessages = appendResponseMessages({
              messages,
              responseMessages,
            });

            // Save the complete conversation to the database
            // Map parts to content since upsertChat expects content to be stored as parts in DB
            const messagesToSave: Message[] = updatedMessages.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: (msg.parts || msg.content || "") as any, // Cast to any since upsertChat stores content as JSON parts
              createdAt: msg.createdAt,
            }));

            const saveConversationSpan = trace.span({
              name: "upsert-chat-after-stream",
              input: {
                userId: session.user.id,
                chatId,
                title,
                messageCount: messagesToSave.length,
              },
            });

            const saveResult = await upsertChat({
              userId: session.user.id,
              chatId,
              title,
              messages: messagesToSave,
            });

            saveConversationSpan.end({
              output: saveResult,
            });

            // Flush the Langfuse trace to the platform
            await langfuse.flushAsync();
          } catch (error) {
            console.error("Error saving chat after completion:", error);
          }
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occurred!";
    },
  });
}
