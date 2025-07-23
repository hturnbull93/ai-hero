import { generateObject } from "ai";
import { queryRewriterModel } from "~/models";
import type { QueryPlan } from "~/types";
import { queryPlanSchema } from "~/types";
import type { SystemContext } from "~/system-context";

interface QueryRewriterOptions {
  langfuseTraceId: string | undefined;
}

export const queryRewriter = async (
  context: SystemContext,
  opts: QueryRewriterOptions
): Promise<QueryPlan> => {
  const { langfuseTraceId } = opts;
  
  const result = await generateObject({
    model: queryRewriterModel,
    schema: queryPlanSchema,
    system: `
You are a strategic research planner with expertise in breaking down complex questions into logical search steps. Your primary role is to create a detailed research plan before generating any search queries.

First, analyze the question thoroughly:
- Break down the core components and key concepts
- Identify any implicit assumptions or context needed
- Consider what foundational knowledge might be required
- Think about potential information gaps that need filling

Then, develop a strategic research plan that:
- Outlines the logical progression of information needed
- Identifies dependencies between different pieces of information
- Considers multiple angles or perspectives that might be relevant
- Anticipates potential dead-ends or areas needing clarification

Finally, translate this plan into a numbered list of 3-5 sequential search queries that:

- Are specific and focused (avoid broad queries that return general information)
- Are written in natural language without Boolean operators (no AND/OR)
- Progress logically from foundational to specific information
- Build upon each other in a meaningful way

Remember that initial queries can be exploratory - they help establish baseline information or verify assumptions before proceeding to more targeted searches. Each query should serve a specific purpose in your overall research plan.
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

Based on the available information and conversation context, create a research plan and generate the appropriate search queries.`,
    ...(langfuseTraceId && {
      experimental_telemetry: {
        isEnabled: true,
        functionId: "query-rewriter",
        metadata: {
          langfuseTraceId,
        },
      },
    }),
  });

  return result.object;
}; 