import { z } from "zod";
import { generateObject } from "ai";
import { model } from "~/models";
import type { Action } from "~/types";
import type { SystemContext } from "~/system-context";

// Schema for structured output - using a single object with optional fields
// instead of z.union to avoid LLM parsing issues with oneOf
export const actionSchema = z.object({
  type: z
    .enum(["search", "scrape", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe(
      "The query to search for. Required if type is 'search'.",
    )
    .optional(),
  urls: z
    .array(z.string())
    .describe(
      "The URLs to scrape. Required if type is 'scrape'.",
    )
    .optional(),
});

export const getNextAction = async (
  context: SystemContext,
): Promise<Action> => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `You are a helpful assistant that can search the web, scrape a URL, or answer the user's question.`,
    prompt: `
Based on the context, determine the next action to take:

- If you need more information to answer the user's question, choose "search" and provide a specific query.
- If you have found relevant URLs that need to be scraped for detailed content, choose "scrape" and provide the URLs.
- If you have enough information to provide a comprehensive answer, choose "answer".

Choose the most appropriate action based on the current state of the conversation and the information available.

You have access to the following context from previous actions:

${context.getQueryHistory()}

${context.getScrapeHistory()}
`,
  });

  const action = result.object;

  // Validate and return the appropriate action type
  if (action.type === "search") {
    if (!action.query) {
      throw new Error("Search action requires a query");
    }
    return { type: "search", query: action.query };
  }

  if (action.type === "scrape") {
    if (!action.urls || action.urls.length === 0) {
      throw new Error("Scrape action requires URLs");
    }
    return { type: "scrape", urls: action.urls };
  }

  if (action.type === "answer") {
    return { type: "answer" };
  }

  throw new Error(`Invalid action type: ${action.type}`);
}; 