import type { Geo } from "@vercel/functions";
import type { Message } from "ai";
import type { SearchResult } from "./types";

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The message history
   */
  private messageHistory: Message[];

  /**
   * The history of all searches (search + scrape)
   */
  private searchHistory: SearchHistoryEntry[] = [];

  /**
   * The most recent feedback from getNextAction
   */
  private lastFeedback: string = "";

  private userLocation?: Geo;

  constructor(messages: Message[], userLocation: Geo) {
    this.messageHistory = messages;
    this.userLocation = userLocation;
  }

  /**
   * Get the initial question from the message history
   */
  getInitialQuestion(): string {
    // Find the first user message
    const firstUserMessage = this.messageHistory.find(
      (message) => message.role === "user"
    );
    return firstUserMessage?.content ?? "";
  }

  /**
   * Get the latest user message from the message history
   */
  getLatestUserMessage(): string {
    // Find the last user message
    for (let i = this.messageHistory.length - 1; i >= 0; i--) {
      const message = this.messageHistory[i];
      if (message && message.role === "user") {
        return message.content;
      }
    }
    return "";
  }

  /**
   * Get the full message history as a formatted string
   */
  getMessageHistory(): string {
    return this.messageHistory
      .map((message) => {
        const role = message.role === "user" ? "User" : "Assistant";
        return `<${role}>${message.content}</${role}>`})
      .join("\n\n");
  }

  /**
   * Get the current step
   */
  getStep(): number {
    return this.step;
  }

  /**
   * Increment the step counter
   */
  incrementStep(): void {
    this.step++;
  }

  /**
   * Check if we should stop the loop
   */
  shouldStop(): boolean {
    return this.step >= 5;
  }

  reportSearch(search: SearchHistoryEntry) {
    this.searchHistory.push(search);
  }

  getAllSearchResults(): SearchHistoryEntry[] {
    return this.searchHistory;
  }

  getSearchHistory(): string {
    return this.searchHistory
      .map((search) =>
        [
          `## Query: "${search.query}"`,
          ...search.results.map((result) =>
            [
              `### ${result.date} - ${result.title}`,
              result.url,
              result.snippet,
              `<summary_result>`,
              result.summary,
              `</summary_result>`,
            ].join("\n\n"),
          ),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  /**
   * Store the most recent feedback from getNextAction
   */
  setLastFeedback(feedback: string): void {
    this.lastFeedback = feedback;
  }

  /**
   * Get the most recent feedback from getNextAction
   */
  getLastFeedback(): string {
    return this.lastFeedback;
  }

  /**
   * Get the user location as a formatted string
   */
  getUserLocation() {
    return this.userLocation ? `
    - lat: ${this.userLocation?.latitude ?? "unknown"}
    - lon: ${this.userLocation?.longitude ?? "unknown"}
    - city: ${this.userLocation?.city ?? "unknown"}
    - country: ${this.userLocation?.country ?? "unknown"}
    ` : "";
  }
} 