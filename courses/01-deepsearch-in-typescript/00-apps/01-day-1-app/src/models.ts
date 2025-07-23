import { google } from "@ai-sdk/google";

// Available Gemini models - you can test different variants:
// - "gemini-2.0-flash-001" (recommended - latest with tool calling)
// - "gemini-1.5-pro" (larger context window)
// - "gemini-1.5-flash" (faster, good balance)
// - "gemini-1.5-flash-8b" (most efficient)

/**
 * Production models
 */
export const getNextActionModel = google("gemini-2.0-flash-001");

export const answerQuestionModel = google("gemini-2.0-flash-001");

export const generateChatTitleModel = google("gemini-1.5-flash");

export const summarisationModel = google("gemini-2.0-flash-lite");

export const queryRewriterModel = google("gemini-2.0-flash-001");

/**
 * Evaluation models
 */
export const factualityModel = google("gemini-2.0-flash-001");