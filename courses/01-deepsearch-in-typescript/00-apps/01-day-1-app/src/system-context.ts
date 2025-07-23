import type { Geo } from "@vercel/functions";
import type { Message } from "ai";

type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

type ScrapeResult = {
  url: string;
  result: string;
};

const toQueryResult = (
  query: QueryResultSearchResult,
) =>
  [
    `### ${query.date} - ${query.title}`,
    query.url,
    query.snippet,
  ].join("\n\n");

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
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

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
    return firstUserMessage?.content || "";
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
    return this.step >= 10;
  }

  /**
   * Report queries that have been searched
   */
  reportQueries(queries: QueryResult[]): void {
    this.queryHistory.push(...queries);
  }

  /**
   * Report scrapes that have been performed
   */
  reportScrapes(scrapes: ScrapeResult[]): void {
    this.scrapeHistory.push(...scrapes);
  }

  /**
   * Get all the information we have gathered so far
   */
  getInformation(): string {
    const queryInfo = this.queryHistory
      .map((query) => {
        const results = query.results.map(toQueryResult).join("\n\n");
        return `## Search Results for "${query.query}"\n\n${results}`;
      })
      .join("\n\n");

    const scrapeInfo = this.scrapeHistory
      .map((scrape) => {
        return `## Scraped Content from ${scrape.url}\n\n${scrape.result}`;
      })
      .join("\n\n");

    return [queryInfo, scrapeInfo].filter(Boolean).join("\n\n");
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