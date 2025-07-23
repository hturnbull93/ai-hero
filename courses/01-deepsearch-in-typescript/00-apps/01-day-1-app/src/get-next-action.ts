import { generateObject } from "ai";
import { getNextActionModel } from "~/models";
import type { Action } from "~/types";
import { actionSchema } from "~/types";
import type { SystemContext } from "~/system-context";

interface GetNextActionOptions {
  langfuseTraceId: string | undefined;
}

export const getNextAction = async (
  context: SystemContext,
  opts: GetNextActionOptions
): Promise<Action> => {
  const { langfuseTraceId } = opts;
  
  const result = await generateObject({
    model: getNextActionModel,
    schema: actionSchema,
    system: `
You are a research assistant.

You are given a user's question, and a list of search results.

You must decide the next action to take, based on the information available so far. Choose only one of the following actions:

1. **continue** - Continue searching for more information about the user's question
2. **answer** - Provide a final answer to the user's question
`,
    prompt: `
## Current Information Available:
${context.getSearchHistory()}

## User Location:
${context.getUserLocation()}

## Current Date:
${new Date().toISOString().split('T')[0]} (${new Date().toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' })})

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
  if (action.type === "continue") {
    return {
      type: "continue",
      title: action.title,
      reasoning: action.reasoning,
    };
  }

  if (action.type === "answer") {
    return {
      type: "answer",
      title: action.title,
      reasoning: action.reasoning,
    };
  }

  throw new Error(`Invalid action type: ${action.type}`);
}; 