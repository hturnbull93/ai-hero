import { generateObject } from "ai";
import { model } from "~/models";
import type { Action } from "~/types";
import { actionSchema } from "~/types";
import type { SystemContext } from "~/system-context";

export const getNextAction = async (
  context: SystemContext,
): Promise<Action> => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `
You are a helpful assistant that can search the web, scrape a URL, or answer the user's question.

**Current Date:** ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' })})

`,
    prompt: `
You must decide the next action to take, based on the information available so far. Choose only one of the following actions:

1. **search**  
   - Use this if you need more information to answer the user's question.
   - Provide a specific search query.
   - Tips:
     - Do not make assumptions, instead search for the information.
     - If you don't have enough information yet, choose to search for the information.
     - If the user asks for "up to date", "recent", "latest", or "current" information, add date-related keywords to your query (e.g., "${new Date().toISOString().split('T')[0]}", "latest", "recent", "today", "this week", "this month", "this year").
     - If the user's request mentions a specific person, company, or organization, include their name in your query. Prefer results from their official website.

2. **scrape**  
   - Use this if you have found relevant URLs that should be scraped for more detailed content.
   - Provide the URLs to scrape.
   - Tips:
     - If the user's request mentions a specific person, company, or organization, prefer URLs from their official website.

3. **answer**  
   - Use this if you have enough information to provide a comprehensive answer to the user's question.

**Instructions:**  
- Carefully review the current state of the conversation and the information available.
- Select the single most appropriate action: "search", "scrape", or "answer".
- If you select "search", provide a specific query.
- If you select "scrape", provide the URLs to scrape.
- If you select "answer", you do not need to provide any additional fields.

User's Question: ${context.getInitialQuestion()}

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