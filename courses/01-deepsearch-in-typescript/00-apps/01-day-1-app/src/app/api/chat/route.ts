import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
} from "ai";
import { z } from "zod";
import { model } from "~/models";
import { auth } from "~/server/auth";
import { searchSerper } from "~/serper";
import { checkRateLimit, recordRequest } from "~/server/rate-limiting";

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
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages } = body;

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
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
} 