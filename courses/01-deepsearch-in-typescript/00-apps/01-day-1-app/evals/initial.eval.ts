import { evalite } from "evalite";
import { askDeepSearch } from "~/deep-search";
import type { Message } from "ai";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: Message[] }[]> => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            content:
              "What is the latest version of TypeScript?",
          },
        ],
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            content:
              "What are the main features of Next.js 15?",
          },
        ],
      },
      {
        input: [
          {
            id: "3",
            role: "user",
            content:
              "How do I fix the 'Module not found' error in React?",
          },
        ],
      },
      {
        input: [
          {
            id: "4",
            role: "user",
            content:
              "What are the differences between Vite and Webpack?",
          },
        ],
      },
      {
        input: [
          {
            id: "5",
            role: "user",
            content:
              "What are the best practices for API design in 2025?",
          },
        ],
      },
      {
        input: [
          {
            id: "6",
            role: "user",
            content:
              "How to implement authentication with NextAuth.js v5?",
          },
        ],
      },
      {
        input: [
          {
            id: "7",
            role: "user",
            content:
              "What are the performance benefits of React Server Components?",
          },
        ],
      },
      {
        input: [
          {
            id: "8",
            role: "user",
            content:
              "How to optimize bundle size in modern JavaScript applications?",
          },
        ],
      },
    ];
  },
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description:
        "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        // Check for markdown link syntax: [text](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const containsLinks = markdownLinkRegex.test(output);

        return containsLinks ? 1 : 0;
      },
    },
  ],
}); 