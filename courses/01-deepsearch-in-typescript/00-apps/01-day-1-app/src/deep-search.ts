import {
  streamText,
  type Message,
  type TelemetrySettings,
  type StreamTextResult,
} from "ai";
import { runAgentLoop } from "./run-agent-loop";
import type { MessageAnnotation } from "./types";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
  writeMessageAnnotation?: (annotation: MessageAnnotation) => void;
}): Promise<StreamTextResult<{}, string>> => {
  // Get the user's question from the messages
  const userQuestion = opts.messages[opts.messages.length - 1]?.content;
  if (!userQuestion || typeof userQuestion !== "string") {
    throw new Error("No user question found in messages");
  }

  // Run the agent loop and wait for the result
  const result = await runAgentLoop(userQuestion, {
    writeMessageAnnotation: opts.writeMessageAnnotation ?? (() => {}),
  });
  
  return result;
};

export async function askDeepSearch(messages: Message[]) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
} 