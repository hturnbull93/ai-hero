import { generateObject } from "ai";
import { model } from "~/models";
import type { Action } from "~/types";
import { actionSchema } from "~/types";
import type { SystemContext } from "~/system-context";

interface GetNextActionOptions {
  langfuseTraceId?: string;
}

export const getNextAction = async (
  context: SystemContext,
  opts: GetNextActionOptions
): Promise<Action> => {
  const { langfuseTraceId } = opts;
  
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `
You are a helpful assistant that can search the web, scrape a URL, or answer the user's question.

**Current Date:** ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' })})

`,
    prompt: `
You must decide the next action to take, based on the information available so far. Choose only one of the following actions:

1. **search** - Search the web for more information about the user's question
2. **scrape** - Scrape content from specific URLs that have been found
3. **answer** - Provide a final answer to the user's question

## Current Information Available:
${context.getInformation()}

## User Location:
${context.getUserLocation()}

## Message History:
${context.getMessageHistory()}

## Latest User Message:
${context.getLatestUserMessage()}

Based on the available information and conversation context, what should be the next action?`,
    ...(langfuseTraceId && {
      experimental_telemetry: {
        isEnabled: true,
        functionId: "get-next-action",
        metadata: {
          langfuseTraceId,
        },
      },
    }),
  });

  const action = result.object;

  // Validate and return the appropriate action type
  if (action.type === "search") {
    if (!action.query) {
      throw new Error("Search action requires a query");
    }
    return { 
      type: "search", 
      query: action.query,
      title: action.title,
      reasoning: action.reasoning
    };
  }

  if (action.type === "scrape") {
    if (!action.urls || action.urls.length === 0) {
      throw new Error("Scrape action requires URLs");
    }
    return { 
      type: "scrape", 
      urls: action.urls,
      title: action.title,
      reasoning: action.reasoning
    };
  }

  if (action.type === "answer") {
    return { 
      type: "answer",
      title: action.title,
      reasoning: action.reasoning
    };
  }

  throw new Error(`Invalid action type: ${action.type}`);
}; 