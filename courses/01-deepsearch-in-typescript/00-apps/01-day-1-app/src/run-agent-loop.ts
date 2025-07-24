import { getNextAction } from "./get-next-action";
import { queryRewriter } from "./query-rewriter";
import { SystemContext } from "./system-context";
import { searchSerper } from "./serper";
import { bulkCrawlWebsites } from "./scraper";
import { answerQuestion } from "./answer-question";
import { type streamText } from "ai";
import type { Action, MessageAnnotation } from "./types";
import type { StreamTextResult, Message } from "ai";
import type { Geo } from "@vercel/functions";
import { env } from "./env";
import { summariseURL } from "./summarise";

const searchScrapeAndSummarise = async (query: string, ctx: SystemContext, langfuseTraceId?: string) => {
  const numResults = env.SEARCH_RESULTS_COUNT || 5;
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

  const conversationHistory = ctx.getMessageHistory();

  // Summarise all results in parallel
  const summaryMap = new Map<string, string>();
  await Promise.all(results.map(async (result) => {
    const scrapedContent = scrapedContentMap.get(result.link) ?? "";
    if (!scrapedContent.trim()) {
      summaryMap.set(result.link, "summarisation failed");
      return;
    }
    const summary = await summariseURL({
      conversationHistory,
      scrapedContent,
      searchMetadata: {
        date: result.date ?? "",
        title: result.title ?? "",
        url: result.link ?? "",
        snippet: result.snippet ?? "",
      },
      query,
      langfuseTraceId,
    });

    summaryMap.set(result.link, summary);
  }));

  return {
    query,
    results: results.map((result) => ({
      date: result.date ?? "",
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      scrapedContent: scrapedContentMap.get(result.link) ?? "",
      summary: summaryMap.get(result.link) ?? "summarisation failed",
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
    // 1. Run the query rewriter to get the plan and queries
    const queryPlan = await queryRewriter(ctx, {
      langfuseTraceId: opts.langfuseTraceId,
    });

    // Send annotation about the query plan
    opts.writeMessageAnnotation({
      type: "QUERY_PLAN",
      plan: queryPlan.plan,
      queries: queryPlan.queries,
    });

    // 2. Search for all queries in parallel
    const searchResults = await Promise.all(queryPlan.queries.map(query =>
      searchScrapeAndSummarise(query, ctx, opts.langfuseTraceId)
    ));

    // 3. Save all search results to the context
    for (const result of searchResults) {
      ctx.reportSearch(result);
    }

    // 4. Decide whether to continue or answer
    const nextAction: Action = await getNextAction(ctx, {
      langfuseTraceId: opts.langfuseTraceId,
    });

    // Store the feedback in the system context
    ctx.setLastFeedback(nextAction.feedback);

    // Send annotation about the action we're about to take
    opts.writeMessageAnnotation({
      type: "NEW_ACTION",
      action: nextAction,
    });

    if (nextAction.type === "answer") {
      return answerQuestion(ctx, {
        langfuseTraceId: opts.langfuseTraceId,
        onFinish: opts.onFinish,
      });
    }

    // If continue, increment the step and repeat
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
