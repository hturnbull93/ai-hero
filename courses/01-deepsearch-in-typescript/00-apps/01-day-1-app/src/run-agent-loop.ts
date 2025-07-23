import { getNextAction } from "./get-next-action";
import { SystemContext } from "./system-context";
import { searchSerper } from "./serper";
import { bulkCrawlWebsites } from "./scraper";
import { answerQuestion } from "./answer-question";
import { type streamText } from "ai";
import type { Action, MessageAnnotation } from "./types";
import type { StreamTextResult, Message } from "ai";
import type { Geo } from "@vercel/functions";

const searchWeb = async (query: string) => {
  const results = await searchSerper(
    {
      q: query,
      num: 10,
    },
    undefined,
  );

  return {
    query,
    results: results.organic.map((result) => ({
      date: result.date ?? "",
      title: result.title,
      url: result.link,
      snippet: result.snippet,
    })),
  };
};

const scrapeUrl = async (urls: string[]) => {
  const result = await bulkCrawlWebsites({ urls });

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.results.map((r) => ({
    url: r.url,
    result: r.result.data,
  }));
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
      const result = await searchWeb(nextAction.query);
      ctx.reportQueries([result]);
    } else if (nextAction.type === "scrape") {
      const result = await scrapeUrl(nextAction.urls);
      ctx.reportScrapes(result);
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
