import type { Message } from "ai";

export const regressionData: { input: Message[]; expected: string }[] = [
  // Additional basic questions for regression testing
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "What is the capital of France?",
      },
    ],
    expected: "Paris",
  },
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "What is the largest planet in our solar system?",
      },
    ],
    expected: "Jupiter is the largest planet in our solar system.",
  },
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "Who wrote Romeo and Juliet?",
      },
    ],
    expected: "William Shakespeare wrote Romeo and Juliet.",
  },
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "What is the chemical symbol for gold?",
      },
    ],
    expected: "The chemical symbol for gold is Au.",
  },
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "What year did World War II end?",
      },
    ],
    expected: "World War II ended in 1945.",
  },
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "What is the square root of 144?",
      },
    ],
    expected: "The square root of 144 is 12.",
  },
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "What is the main component of the sun?",
      },
    ],
    expected: "The main component of the sun is hydrogen.",
  },
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "What is the largest ocean on Earth?",
      },
    ],
    expected: "The Pacific Ocean is the largest ocean on Earth.",
  },
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "Who painted the Mona Lisa?",
      },
    ],
    expected: "Leonardo da Vinci painted the Mona Lisa.",
  },
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "What is the speed of light?",
      },
    ],
    expected: "The speed of light is approximately 299,792,458 meters per second (about 186,282 miles per second).",
  },
]; 