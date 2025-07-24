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

export interface SearchResult {
  date: string;
  title: string;
  url: string;
  snippet: string;
  scrapedContent: string;
  summary: string; // LLM-generated summary
}

export interface ContinueAction {
  type: "continue";
  title: string;
  reasoning: string;
  feedback: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
  feedback: string;
}

export type Action = ContinueAction | AnswerAction;

export interface QueryPlan {
  plan: string;
  queries: string[];
}

// Zod schema for actions
export const actionSchema = z.object({
  type: z
    .enum(["continue", "answer"])
    .describe(
      `The type of action to take.
      - 'continue': Continue searching for more information.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Continue searching for more information', 'Provide final answer'",
    ),
  reasoning: z
    .string()
    .describe("The reason you chose this step."),
  feedback: z
    .string()
    .describe("Only required if the action is 'continue'. Detailed feedback about what information is still needed or what gaps remain. This will be used to guide the next search iteration."),
});

// Zod schema for query plan
export const queryPlanSchema = z.object({
  plan: z
    .string()
    .describe("A detailed research plan outlining the logical progression of information needed"),
  queries: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("A numbered list of 3-5 sequential search queries that progress logically from foundational to specific information"),
});

// Message annotation type for progress indication
export type MessageAnnotation = {
  type: "NEW_ACTION";
  action: Action;
} | {
  type: "QUERY_PLAN";
  plan: string;
  queries: string[];
};

// Zod schema for message annotations (shared between parsing and serializing)
export const messageAnnotationSchema = z.union([
  z.object({
    type: z.literal("NEW_ACTION"),
    action: actionSchema,
  }),
  z.object({
    type: z.literal("QUERY_PLAN"),
    plan: z.string(),
    queries: z.array(z.string()),
  }),
]);

export type UserLocation = {
  longitude?: string;
  latitude?: string;
  city?: string;
  country?: string;
};
