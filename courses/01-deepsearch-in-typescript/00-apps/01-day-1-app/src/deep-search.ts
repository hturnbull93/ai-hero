import {
  streamText,
  type Message,
  type StreamTextResult,
} from "ai";
import { runAgentLoop } from "./run-agent-loop";
import type { MessageAnnotation } from "./types";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  langfuseTraceId: string | undefined;
  writeMessageAnnotation: (annotation: MessageAnnotation) => void;
}): Promise<StreamTextResult<{}, string>> => {
  // Run the agent loop and wait for the result
  return runAgentLoop(opts.messages, {
    writeMessageAnnotation: opts.writeMessageAnnotation,
    langfuseTraceId: opts.langfuseTraceId,
    onFinish: opts.onFinish,
  });
};

export async function askDeepSearch(messages: Message[]) {
  const result = await streamFromDeepSearch({
    messages,
    writeMessageAnnotation: () => {}, // just a stub
    onFinish: () => {}, // just a stub
    langfuseTraceId: undefined,
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
} 