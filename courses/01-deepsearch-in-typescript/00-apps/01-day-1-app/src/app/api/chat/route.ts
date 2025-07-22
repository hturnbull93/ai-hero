import type { Message } from "ai";
import { createDataStreamResponse, appendResponseMessages } from "ai";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "~/server/auth";
import {
  checkRateLimit,
  recordRateLimit,
  type RateLimitConfig,
} from "~/server/rate-limiting";
import { upsertChat } from "~/server/db/queries";
import { streamFromDeepSearch } from "~/deep-search";
import { isError } from "~/utils";
import type { MessageAnnotation } from "~/types";
import { messageAnnotationSchema } from "~/types";

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

  // Global rate limit configuration - 1 request per 5 seconds for testing
  const config: RateLimitConfig = {
    maxRequests: 1,
    maxRetries: 3,
    windowMs: 5_000, // 5 seconds
    keyPrefix: "global",
  };

  // Check the rate limit
  const rateLimitCheck = await checkRateLimit(config);

  if (!rateLimitCheck.allowed) {
    console.log("Rate limit exceeded, waiting...");
    const isAllowed = await rateLimitCheck.retry();
    // If the rate limit is still exceeded after retries, return a 429
    if (!isAllowed) {
      return new Response("Rate limit exceeded", {
        status: 429,
      });
    }
  }

  // Record the request
  await recordRateLimit(config);

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

      // Wait for the result
      const result = await streamFromDeepSearch({
        messages,
        telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        writeMessageAnnotation: (annotation: MessageAnnotation) => {
          // Use Zod to ensure we have a properly serializable object
          const serializedAnnotation = messageAnnotationSchema.parse(annotation);
          dataStream.writeMessageAnnotation(serializedAnnotation);
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
            const saveConversationSpan = trace.span({
              name: "upsert-chat-after-stream",
              input: {
                userId: session.user.id,
                chatId,
                title,
                messageCount: updatedMessages.length,
              },
            });

            const saveResult = await upsertChat({
              userId: session.user.id,
              chatId,
              title,
              messages: updatedMessages,
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

      // Once the result is ready, merge it into the data stream
      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error("Stream error:", e);

      // Handle AI service rate limits specifically
      if (
        isError(e) &&
        (e.message.includes("quota") ||
          e.message.includes("rate limit") ||
          e.message.includes("429"))
      ) {
        return "AI service is currently rate limited. Please try again in a few minutes.";
      }

      return "An error occurred while processing your request. Please try again.";
    },
  });
}
