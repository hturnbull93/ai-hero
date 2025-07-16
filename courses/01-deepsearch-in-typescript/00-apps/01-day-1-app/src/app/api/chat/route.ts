import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { z } from "zod";
import { model } from "~/models";
import { auth } from "~/server/auth";
import { searchSerper } from "~/serper";
import { checkRateLimit, recordRequest } from "~/server/rate-limiting";
import { upsertChat } from "~/server/db/queries";

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
      await upsertChat({
        userId: session.user.id,
        chatId,
        title,
        messages,
      });

      const result = streamText({
        model,
        messages,
        system: `You are a helpful AI assistant that can search the web for current information. 

You should ALWAYS use the search web tool to find up-to-date information when answering user questions, especially for:
- Current events
- Recent news
- Latest information about companies, people, or topics
- Technical documentation or updates
- Any factual claims that might change over time

The web tool provides results in an array of objects with the format:
  {
    "title": string
    "link": string
    "snippet": string
  }
When providing information, ALWAYS cite your sources using inline links in this format: [result.title](result.link)
Use data from the results object, don't literally include the text "result.title".

Be comprehensive in your responses and make sure to provide multiple relevant sources when available.`,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              const results = await searchSerper(
                { q: query, num: 10 },
                abortSignal,
              );

              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
              }));
            },
          },
        },
        maxSteps: 10,
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

            await upsertChat({
              userId: session.user.id,
              chatId,
              title,
              messages: messagesToSave,
            });
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
