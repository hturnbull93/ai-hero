import { z } from "zod";

export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatContextType {
  chats: Chat[];
  addChat: (chat: Chat) => void;
  removeChat: (chatId: string) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
}

// Action types for the getNextAction function
export interface SearchAction {
  type: "search";
  query: string;
  title: string;
  reasoning: string;
}

export interface ScrapeAction {
  type: "scrape";
  urls: string[];
  title: string;
  reasoning: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action = SearchAction | ScrapeAction | AnswerAction;

// Zod schema for actions (used by getNextAction and message annotations)
export const actionSchema = z.object({
  type: z
    .enum(["search", "scrape", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching Saka's injury history', 'Checking HMRC industrial action', 'Comparing toaster ovens'",
    ),
  reasoning: z
    .string()
    .describe("The reason you chose this step."),
  query: z
    .string()
    .describe(
      "The query to search for. Only required if type is 'search'.",
    )
    .optional(),
  urls: z
    .array(z.string())
    .describe(
      "The URLs to scrape. Only required if type is 'scrape'.",
    )
    .optional(),
});

// Message annotation type for progress indication
export type MessageAnnotation = {
  type: "NEW_ACTION";
  action: Action;
};

// Zod schema for message annotations (shared between parsing and serializing)
export const messageAnnotationSchema = z.object({
  type: z.literal("NEW_ACTION"),
  action: actionSchema,
}); 