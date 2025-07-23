import { generateText } from "ai";
import type { Message } from "ai";
import { generateChatTitleModel } from "~/models";

export function isNewChatCreated(
  data: unknown,
): data is {
  type: "NEW_CHAT_CREATED";
  chatId: string;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "NEW_CHAT_CREATED"
  );
}

export function isTitleUpdated(
  data: unknown,
): data is {
  type: "TITLE_UPDATED";
  chatId: string;
  title: string;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "TITLE_UPDATED" &&
    "chatId" in data &&
    typeof data.chatId === "string" &&
    "title" in data &&
    typeof data.title === "string"
  );
}

export function isError(error: unknown): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: string }).message === "string"
  );
}

export const generateChatTitle = async (
  messages: Message[],
) => {
  const { text } = await generateText({
    model: generateChatTitleModel,
    system: `You are a chat title generator.
      You will be given a chat history, and you will need to generate a title for the chat.
      The title should be a single sentence that captures the essence of the chat.
      The title should be no more than 50 characters.
      The title should be in the same language as the chat history.
      `,
    prompt: `Here is the chat history:

      ${messages.map((m) => m.content).join("\n")}
    `,
  });

  return text;
};