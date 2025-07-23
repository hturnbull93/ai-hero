import { generateText } from "ai";
import { summarisationModel } from "~/models";
import { cacheWithRedis } from "~/server/redis/redis";

/**
 * Summarises a scraped URL using the LLM, with Redis caching and telemetry.
 * @param opts - The options for summarization
 * @returns The summary string
 */
export const summariseURL = cacheWithRedis(
  "summariseURL",
  async (opts: {
    conversationHistory: string;
    scrapedContent: string;
    searchMetadata: {
      date: string;
      title: string;
      url: string;
      snippet: string;
    };
    query: string;
    langfuseTraceId?: string;
  }) => {
    const { conversationHistory, scrapedContent, searchMetadata, query, langfuseTraceId } = opts;
    const { date, title, url, snippet } = searchMetadata;
    const systemPrompt = `You are a research extraction specialist. Given a research topic and raw web content, create a thoroughly detailed synthesis as a cohesive narrative that flows naturally between key concepts.

Extract the most valuable information related to the research topic, including relevant facts, statistics, methodologies, claims, and contextual information. Preserve technical terminology and domain-specific language from the source material.

Structure your synthesis as a coherent document with natural transitions between ideas. Begin with an introduction that captures the core thesis and purpose of the source material. Develop the narrative by weaving together key findings and their supporting details, ensuring each concept flows logically to the next.

Integrate specific metrics, dates, and quantitative information within their proper context. Explore how concepts interconnect within the source material, highlighting meaningful relationships between ideas. Acknowledge limitations by noting where information related to aspects of the research topic may be missing or incomplete.

Important guidelines:
- Maintain original data context (e.g., "2024 study of 150 patients" rather than generic "recent study")
- Preserve the integrity of information by keeping details anchored to their original context
- Create a cohesive narrative rather than disconnected bullet points or lists
- Use paragraph breaks only when transitioning between major themes

Critical Reminder: If content lacks a specific aspect of the research topic, clearly state that in the synthesis, and you should NEVER make up information and NEVER rely on external knowledge.`;
    const prompt = `# Research Topic
${query}

# Search Result Metadata
- Title: ${title}
- Date: ${date}
- URL: ${url}
- Snippet: ${snippet}

# Conversation History
${conversationHistory}

# Raw Web Content
<raw_web_content>
${scrapedContent}
</raw_web_content>

# Instructions
Summarise the above web content as described in the system prompt, focusing on the research topic."`;
    const { text } = await generateText({
      model: summarisationModel,
      system: systemPrompt,
      prompt,
      ...(langfuseTraceId && {
        experimental_telemetry: {
          isEnabled: true,
          functionId: "summarise-url",
          metadata: { langfuseTraceId },
        },
      }),
    });
    return text;
  }
); 