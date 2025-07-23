import { geolocation } from "@vercel/functions";
import type { Message } from "ai";
import { appendResponseMessages, createDataStream } from "ai";
import Redis from "ioredis";
import { Langfuse } from "langfuse";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream/ioredis";
import { streamFromDeepSearch } from "~/deep-search";
import { env } from "~/env";
import { auth } from "~/server/auth";
import {
  appendStreamId,
  getChat,
  getStreamIds,
  upsertChat,
} from "~/server/db/queries";
import {
  checkRateLimit,
  recordRateLimit,
  type RateLimitConfig,
} from "~/server/rate-limiting";
import type { MessageAnnotation } from "~/types";
import { messageAnnotationSchema } from "~/types";
import { generateChatTitle, isError } from "~/utils";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

const streamContext = createResumableStreamContext({
  waitUntil: after,
  publisher: new Redis(env.REDIS_URL),
  subscriber: new Redis(env.REDIS_URL),
});

export const maxDuration = 60;

export async function POST(request: Request) {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Mock headers in development for local testing
  if (process.env.NODE_ENV === "development") {
    request.headers.set("x-vercel-ip-country", "UK");
    request.headers.set("x-vercel-ip-country-region", "GB");
    request.headers.set("x-vercel-ip-city", "London");
  }

  // Get geolocation info
  const userLocation = geolocation(request);

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
  const { messages, chatId, isNewChat } = body;

  const streamId = crypto.randomUUID();

  const stream = createDataStream({
    execute: async (dataStream) => {
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

      // Start title generation in parallel if this is a new chat
      let titlePromise: Promise<string> | undefined;

      if (isNewChat) {
        titlePromise = generateChatTitle(messages);
      } else {
        titlePromise = Promise.resolve("");
      }

      // Save the current messages to the database before starting the stream
      // Use "Generating..." as temporary title for new chats
      const tempTitle = "Generating...";

      const upsertChatSpan = trace.span({
        name: "upsert-chat-before-stream",
        input: {
          userId: session.user.id,
          chatId,
          title: tempTitle,
          messageCount: messages.length,
        },
      });

      const upsertResult = await upsertChat({
        userId: session.user.id,
        chatId,
        title: tempTitle,
        messages,
      });

      upsertChatSpan.end({
        output: upsertResult,
      });

      // Now that the chat is created, we can safely create the stream
      await appendStreamId(chatId, streamId);

      // Update trace with sessionId now that we have the chatId
      trace.update({
        sessionId: chatId,
      });

      // Collect annotations in memory
      const annotations: MessageAnnotation[] = [];

      // Wait for the result
      const result = await streamFromDeepSearch({
        messages,
        userLocation,
        langfuseTraceId: trace.id,
        writeMessageAnnotation: (annotation: MessageAnnotation) => {
          // Save the annotation in-memory
          annotations.push(annotation);
          // Use Zod to ensure we have a properly serializable object
          const serializedAnnotation =
            messageAnnotationSchema.parse(annotation);
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

            // Get the last message and add annotations to it
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage) {
              // Ensure annotations are serializable as JSONValue[]
              lastMessage.annotations = annotations.map((annotation) =>
                messageAnnotationSchema.parse(annotation),
              );
            }

            // Resolve the title promise if it exists
            const title = await titlePromise;

            // Save the complete conversation to the database
            const saveMessageSpan = trace.span({
              name: "upsert-chat-after-stream",
              input: {
                userId: session.user.id,
                chatId,
                title: title || tempTitle,
                messageCount: updatedMessages.length,
              },
            });

            const saveResult = await upsertChat({
              userId: session.user.id,
              chatId,
              messages: updatedMessages,
              ...(title ? { title } : {}), // Only save the title if it's not empty
            });

            saveMessageSpan.end({
              output: saveResult,
            });

            // Send title update event to frontend if title was generated
            if (title && title !== tempTitle) {
              dataStream.writeData({
                type: "TITLE_UPDATED",
                chatId,
                title,
              });
            }

            // Flush the Langfuse trace to the platform
            await langfuse.flushAsync();
          } catch (error) {
            console.error("Error saving chat after completion:", error);
          }
        },
      });

      // Once the result is ready, merge it into the data stream
      result.mergeIntoDataStream(dataStream);

      // Consume the stream to ensure it can be resumed if needed
      await result.consumeStream();
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

  return new Response(
    await streamContext.resumableStream(streamId, () => stream),
  );
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");
  if (!chatId) {
    return new Response("No chatId provided", { status: 400 });
  }

  const chat = await getChat(chatId, session.user.id);
  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  const { mostRecentStreamId, streamIds } = await getStreamIds(chatId);
  if (!streamIds.length) {
    return new Response("No streamIds found", { status: 404 });
  }
  if (!mostRecentStreamId) {
    return new Response("No mostRecentStreamId found", { status: 404 });
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    mostRecentStreamId,
    () => emptyDataStream,
  );

  if (stream) {
    return new Response(stream, { status: 200 });
  }

  const mostRecentMessage = chat.messages[chat.messages.length - 1];

  if (!mostRecentMessage || mostRecentMessage.role !== "assistant") {
    return new Response(emptyDataStream, { status: 200 });
  }

  const streamWithMessage = createDataStream({
    execute: (dataStream) => {
      dataStream.writeData({
        type: "append-message",
        message: JSON.stringify(mostRecentMessage),
      });
    },
  });

  return new Response(streamWithMessage, { status: 200 });
}
