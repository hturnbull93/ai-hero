import { google } from "@ai-sdk/google";

// Available Gemini models - you can test different variants:
// - "gemini-2.0-flash-001" (recommended - latest with tool calling)
// - "gemini-1.5-pro" (larger context window)
// - "gemini-1.5-flash" (faster, good balance)
// - "gemini-1.5-flash-8b" (most efficient)

export const model = google("gemini-2.0-flash-001");

export const factualityModel = google("gemini-2.0-flash-001");
