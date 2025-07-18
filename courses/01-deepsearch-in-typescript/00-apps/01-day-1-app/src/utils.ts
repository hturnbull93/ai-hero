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

export function isError(error: unknown): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: string }).message === "string"
  );
}