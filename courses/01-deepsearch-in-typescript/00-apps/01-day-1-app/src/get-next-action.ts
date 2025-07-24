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
You are a research query optimizer. Your task is to analyze search results against the original research goal and either decide to answer the question or to search for more information.

PROCESS:
1. Identify ALL information explicitly requested in the original research goal
2. Analyze what specific information has been successfully retrieved in the search results
3. Identify ALL information gaps between what was requested and what was found
4. For entity-specific gaps: Create targeted queries for each missing attribute of identified entities
5. For general knowledge gaps: Create focused queries to find the missing conceptual information

When you decide to continue searching, provide detailed feedback about:
- What specific information is still missing
- What types of sources would be most helpful
- Any specific entities, dates, or concepts that need more detail
- Whether the current search results are relevant but insufficient, or if we need to search in a different direction entirely

Choose only one of the following actions:
1. **continue** - Continue searching for more information about the user's question, based on the feedback provided.
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
      feedback: action.feedback,
    };
  }

  if (action.type === "answer") {
    return {
      type: "answer",
      title: action.title,
      reasoning: action.reasoning,
      feedback: action.feedback,
    };
  }

  throw new Error(`Invalid action type: ${action.type}`);
}; 