import {
  streamText,
  type Message,
  type TelemetrySettings,
} from "ai";
import { z } from "zod";
import { model } from "~/models";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/scraper";
import { cacheWithRedis } from "~/server/redis/redis";

// Cache the scrapePages function
const scrapePages = cacheWithRedis(
  "scrapePages",
  async (urls: string[]) => {
    const result = await bulkCrawlWebsites({ urls });
    return result;
  },
);

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) =>
  streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    system: `You are a helpful AI assistant that can search the web for current information and scrape web pages for detailed content.

**Current Date and Time:** ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' })})

When users ask for "up to date", "recent", "latest", or "current" information, make sure to include relevant date-related keywords in your search queries (e.g., "2024", "latest", "recent", "today", "this week", "this month", "this year").

You have access to two powerful tools:

1. **searchWeb**: Use this to find relevant web pages and get search results with titles, links, snippets, and publication dates when available.
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
1. ALWAYS start with searchWeb to find relevant pages
  - If the user asks for a specific date, make sure to include the date in the search query
2. Use scrapePages on the most relevant URLs to get full content
3. Provide comprehensive answers with proper citations

The searchWeb tool provides results in this format:
  {
    "title": string
    "link": string
    "snippet": string
    "date": string (when available)
  }

The scrapePages tool returns full page content in markdown format, or error messages if scraping fails.

When providing information, ALWAYS cite your sources using inline links in this format: [result.title](result.link)
Use data from the results object, don't literally include the text "result.title".

When publication dates are available, mention them to help users understand how current the information is.

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
            date: result.date || null,
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
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });

export async function askDeepSearch(messages: Message[]) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
} 