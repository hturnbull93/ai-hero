import { streamText } from "ai";
import { answerQuestionModel } from "./models";

export const generateSafetyRefusal = async (
  reason: string | undefined,
  opts: {
    onFinish: Parameters<typeof streamText>[0]["onFinish"];
  },
) => {
  return streamText({
    model: answerQuestionModel,
    system: `You are a helpful AI assistant that prioritizes safety. When a request is flagged as unsafe, explain why you cannot help with that specific request while being professional and clear.

The user's request has been flagged as unsafe by our safety system.`,
    prompt: `Reason: ${reason || "The request violates our safety guidelines."}

Please explain to the user that you cannot help with this request due to safety concerns. Be professional, clear, and helpful while maintaining firm boundaries.`,
    onFinish: opts.onFinish,
  });
}; 