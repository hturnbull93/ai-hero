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
    system: `
You are a helpful AI assistant with access to two tools for web research:

- **searchWeb**: Find relevant web pages and get search results (title, link, snippet, publication date).
- **scrapePages**: Retrieve the full content of web pages in markdown format for detailed analysis.

**Current Date:** ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' })})

---

## How to Use Your Tools

### 1. searchWeb
- **Purpose:** Find current information, discover sources, get overviews, and gather quick summaries.
- **When to Use:** Always start with searchWeb to identify relevant pages.
- **Tip:** If the user requests "up to date", "recent", "latest", or "current" information, include date-related keywords in your search (e.g., "${new Date().toISOString().split('T')[0]}", "latest", "recent", "today", "this week", "this month", "this year").

### 2. scrapePages
- **Purpose:** Obtain full page content for in-depth analysis.
- **When to Use:** After searchWeb, use scrapePages on the most relevant URLs, especially when:
  - The user requests detailed or comprehensive information.
  - Snippets from search results are insufficient.

---

## Best Practice Workflow

1. **Start with searchWeb** to gather relevant sources.
2. **If more detail is needed**, use scrapePages on selected URLs.
3. **Compose your answer**:
   - Be comprehensive and synthesize information from multiple sources.
   - Always cite your sources using inline links: [Title](URL).
   - Mention publication dates when available to indicate information freshness.

---

## Data Formats

- **searchWeb result:**
  \`\`\`json
  {
    "title": string,
    "link": string,
    "snippet": string,
    "date": string (when available)
  }
  \`\`\`
- **scrapePages result:** Markdown content or error message for each URL.

---

## Citing Sources

When citing sources, always use clear and consistent formatting to ensure transparency and credibility. Follow these guidelines:

- For each source, use the format: [Title](URL)
- If the source is a webpage and a publication date is available, include it in parentheses after the title in the format: [Title (YYYY-MM-DD)](URL)
- If no publication date is available, omit the date.
- Place citations inline at the relevant point in your answer, not as a separate list at the end.
- Ensure that every factual statement or claim is supported by at least one cited source.

### Using searchWeb Results for Citations

When you use the results from the \`searchWeb\` tool, construct your citations using the \`title\`, \`link\`, and (if available) \`date\` fields from the result object. For example, if a searchWeb result is:

\`\`\`json
{
  "title": "TypeScript 5.2 Release Notes",
  "link": "https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/",
  "date": "2023-08-15"
}
\`\`\`

You should cite it as:

[TypeScript 5.2 Release Notes (2023-08-15)](https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/)

---

## Answering Guidelines

- Use information from your tools, not from prior knowledge.
- Never fabricate citations or content.
- Always provide multiple relevant sources when possible.
- Use clear, concise language and structure your response for readability.

`,
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