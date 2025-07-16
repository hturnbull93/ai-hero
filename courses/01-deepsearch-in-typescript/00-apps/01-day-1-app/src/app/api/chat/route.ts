import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { z } from "zod";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { model } from "~/models";
import { auth } from "~/server/auth";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/scraper";
import { cacheWithRedis } from "~/server/redis/redis";
import { checkRateLimit, recordRequest } from "~/server/rate-limiting";
import { upsertChat } from "~/server/db/queries";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

// Cache the scrapePages function
const scrapePages = cacheWithRedis(
  "scrapePages",
  async (urls: string[]) => {
    const result = await bulkCrawlWebsites({ urls });
    return result;
  }
);

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

      // Create Langfuse trace with session and user data
      const trace = langfuse.trace({
        sessionId: chatId,
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
      await upsertChat({
        userId: session.user.id,
        chatId,
        title,
        messages,
      });

      const result = streamText({
        model,
        messages,
        system: `You are a helpful AI assistant that can search the web for current information and scrape web pages for detailed content.

You have access to two powerful tools:

1. **searchWeb**: Use this to find relevant web pages and get search results with titles, links, and snippets.
2. **scrapePages**: Use this to get the full content of web pages in markdown format for detailed analysis.

**When to use searchWeb:**
- To find current information about topics
- To discover relevant web pages and sources
- For getting an overview of available information
- When you need quick snippets and summaries

**When to use scrapePages:**
- After finding relevant URLs with searchWeb, when you need the full content
- When users ask for detailed analysis that requires complete page content
- For extracting comprehensive information from specific pages
- When snippets from search results are insufficient

**Best Practice Workflow:**
1. Start with searchWeb to find relevant pages
2. Use scrapePages on the most relevant URLs to get full content
3. Provide comprehensive answers with proper citations

The searchWeb tool provides results in this format:
  {
    "title": string
    "link": string
    "snippet": string
  }

The scrapePages tool returns full page content in markdown format, or error messages if scraping fails.

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
          scrapePages: {
            parameters: z.object({
              urls: z.array(z.string()).describe("Array of URLs to scrape for full page content"),
            }),
            execute: async ({ urls }) => {
              const result = await scrapePages(urls);
              
              const pages = result.results.map(({ url, result: pageResult }) => ({
                url,
                content: pageResult.success 
                  ? pageResult.data 
                  : `Error: ${(pageResult as { error: string }).error}`,
                success: pageResult.success,
              }));

              if (result.success) {
                return {
                  success: true,
                  pages,
                };
              } else {
                return {
                  success: false,
                  error: result.error,
                  pages,
                };
              }
            },
          },
        },
        maxSteps: 10,
        experimental_telemetry: {
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

            await upsertChat({
              userId: session.user.id,
              chatId,
              title,
              messages: messagesToSave,
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
