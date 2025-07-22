import { generateText } from "ai";
import { model } from "~/models";
import type { SystemContext } from "~/system-context";

interface AnswerOptions {
  isFinal?: boolean;
}

export const answerQuestion = async (
  context: SystemContext,
  options: AnswerOptions = {}
) => {
  const { isFinal = false } = options;
  const userQuestion = context.getInitialQuestion();

  const systemPrompt = `You are a helpful assistant that answers questions based on information gathered from web searches and scraped content.

Your task is to provide a comprehensive and accurate answer to the user's question using the information available.

${isFinal ? "IMPORTANT: You may not have all the information needed to answer the question completely. Make your best effort to provide a helpful answer based on the available information, and clearly indicate any limitations or uncertainties." : ""}

Guidelines:
- Use the search results and scraped content to provide accurate information
- Cite sources when possible
- Be comprehensive but concise
- If information is conflicting, acknowledge the conflicts
- If you don't have enough information, say so clearly`;

  const prompt = `User Question: ${userQuestion}

Available Information:

${context.getQueryHistory()}

${context.getScrapeHistory()}

Please provide a comprehensive answer to the user's question based on the available information.`;

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt,
  });

  return result.text;
}; 