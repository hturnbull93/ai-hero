import { getNextAction } from "./get-next-action";
import { SystemContext } from "./system-context";
import { searchSerper } from "./serper";
import { bulkCrawlWebsites } from "./scraper";
import { answerQuestion } from "./answer-question";
import { type streamText } from "ai";
import type { Action, MessageAnnotation } from "./types";
import type { StreamTextResult, Message } from "ai";
import type { Geo } from "@vercel/functions";
import { env } from "./env";

const searchAndScrape = async (query: string) => {
  const numResults = env.SEARCH_RESULTS_COUNT || 3;
  const searchResult = await searchSerper(
    {
      q: query,
      num: numResults,
    },
    undefined,
  );

  // Only take the top N organic results
  const results = searchResult.organic.slice(0, numResults);
  const urls = results.map((result) => result.link);

  // Scrape all URLs in parallel
  const scrapeResults = await bulkCrawlWebsites({ urls });
  const scrapedContentMap = new Map<string, string>();
  for (const r of scrapeResults.results) {
    if (r.result.success === true) {
      scrapedContentMap.set(r.url, r.result.data);
    } else {
      scrapedContentMap.set(r.url, "");
    }
  }

  return {
    query,
    results: results.map((result) => ({
      date: result.date ?? "",
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      scrapedContent: scrapedContentMap.get(result.link) ?? "",
    })),
  };
};

export const runAgentLoop = async (
  messages: Message[],
  opts: {
    writeMessageAnnotation: (annotation: MessageAnnotation) => void;
    langfuseTraceId?: string;
    onFinish: Parameters<typeof streamText>[0]["onFinish"];
    userLocation: Geo;
  },
): Promise<StreamTextResult<{}, string>> => {
  // A persistent container for the state of our system
  const ctx = new SystemContext(messages, opts.userLocation);

  // A loop that continues until we have an answer
  // or we've taken 10 actions
  while (!ctx.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction: Action = await getNextAction(ctx, {
      langfuseTraceId: opts.langfuseTraceId,
    });

    // Send annotation about the action we're about to take
    opts.writeMessageAnnotation({
      type: "NEW_ACTION",
      action: nextAction,
    });

    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      // Perform search and scrape in one step
      const result = await searchAndScrape(nextAction.query);
      ctx.reportSearch(result);
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx, {
        langfuseTraceId: opts.langfuseTraceId,
        onFinish: opts.onFinish,
      });
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken all actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(ctx, {
    isFinal: true,
    langfuseTraceId: opts.langfuseTraceId,
    onFinish: opts.onFinish,
  });
};
