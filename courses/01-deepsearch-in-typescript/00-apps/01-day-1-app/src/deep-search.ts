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
import { systemPrompt } from "./deep-search-system-prompt";
import { env } from "~/env";

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
    system: systemPrompt,
    tools: {
      searchWeb: {
        parameters: z.object({
          query: z.string().describe("The query to search the web for"),
        }),
        execute: async ({ query }, { abortSignal }) => {
          const results = await searchSerper(
            { q: query, num: env.SEARCH_RESULTS_COUNT },
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