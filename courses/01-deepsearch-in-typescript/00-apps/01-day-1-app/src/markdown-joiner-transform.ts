import type { TextStreamPart } from "ai";

class MarkdownJoiner {
  private buffer = "";
  private isBuffering = false;

  processText(text: string): string {
    let output = "";

    for (const char of text) {
      if (!this.isBuffering) {
        // Check if we should start buffering
        if (char === "[" || char === "*" || char === "_") {
          this.buffer = char;
          this.isBuffering = true;
        } else {
          // Pass through character directly
          output += char;
        }
      } else {
        this.buffer += char;

        // Check for complete markdown elements or false positives
        if (
          this.isCompleteLink() ||
          this.isCompleteBold() ||
          this.isCompleteItalic() ||
          this.isCompleteBoldItalic() ||
          this.isCompleteItalicUnderscore()
        ) {
          // Complete markdown element - flush buffer as is
          output += this.buffer;
          this.clearBuffer();
        } else if (this.isFalsePositive(char)) {
          // False positive - flush buffer as raw text
          output += this.buffer;
          this.clearBuffer();
        }
      }
    }

    return output;
  }

  private isCompleteLink(): boolean {
    // Match [text](url) pattern
    const linkPattern = /^\[.*?\]\(.*?\)$/;
    return linkPattern.test(this.buffer);
  }

  private isCompleteBold(): boolean {
    // Match **text** pattern
    const boldPattern = /^\*\*.*?\*\*$/;
    return boldPattern.test(this.buffer);
  }

  private isCompleteItalic(): boolean {
    // Match *text* pattern (single asterisks)
    const italicPattern = /^\*[^*].*?\*$/;
    return italicPattern.test(this.buffer);
  }

  private isCompleteBoldItalic(): boolean {
    // Match ***text*** pattern (bold italic with three asterisks)
    const boldItalicPattern = /^\*\*\*.*?\*\*\*$/;
    // Also match **_text_** pattern (bold with italic emphasis)
    const boldItalicAltPattern = /^\*\*_.*?_\*\*$/;
    // Also match _**text**_ pattern (italic with bold emphasis)
    const italicBoldPattern = /^_\*.*?\*_$/;
    return boldItalicPattern.test(this.buffer) || boldItalicAltPattern.test(this.buffer) || italicBoldPattern.test(this.buffer);
  }

  private isCompleteItalicUnderscore(): boolean {
    // Match _text_ pattern (italic with underscores)
    const italicUnderscorePattern = /^_.*?_$/;
    return italicUnderscorePattern.test(this.buffer);
  }

  private isFalsePositive(char: string): boolean {
    // For links: if we see [ followed by something other than valid link syntax
    if (this.buffer.startsWith("[")) {
      // If we hit a newline or another [ without completing the link, it's false positive
      return (
        char === "\n" ||
        (char === "[" && this.buffer.length > 1)
      );
    }

    // For asterisks: handle both bold (**) and italic (*) patterns
    if (this.buffer.startsWith("*")) {
      // Single * followed by whitespace is likely a list item
      if (
        this.buffer.length === 1 &&
        /\s/.test(char)
      ) {
        return true;
      }
      
      // If we have ** and hit newline without completing bold, it's false positive
      if (this.buffer.startsWith("**") && char === "\n") {
        return true;
      }
      
      // If we have * (single) and hit newline without completing italic, it's false positive
      if (this.buffer.length === 1 && char === "\n") {
        return true;
      }
      
      // If we have * and the next char is another *, we might be starting bold
      // Let it continue buffering
      if (this.buffer.length === 1 && char === "*") {
        return false;
      }
      
      // If we have ** and hit a third *, it might be bold italic (***)
      if (this.buffer.startsWith("**") && char === "*") {
        return false; // Let it continue buffering for bold italic
      }
      
      // If we have *** and hit a fourth *, it's probably not markdown
      if (this.buffer.startsWith("***") && char === "*") {
        return true;
      }
    }

    // For underscores: handle italic (_text_) and bold italic (**_text_**) patterns
    if (this.buffer.startsWith("_")) {
      // Single _ followed by whitespace is likely not markdown
      if (
        this.buffer.length === 1 &&
        /\s/.test(char)
      ) {
        return true;
      }
      
      // If we have _ and hit newline without completing italic, it's false positive
      if (this.buffer.length === 1 && char === "\n") {
        return true;
      }
      
      // If we have _ and the next char is *, we might be starting italic bold (_*)
      if (this.buffer.length === 1 && char === "*") {
        return false; // Let it continue buffering for italic bold
      }
      
      // If we have _* and hit another *, we might be starting italic bold (_**)
      if (this.buffer.startsWith("_*") && char === "*") {
        return false; // Let it continue buffering for italic bold
      }
    }

    return false;
  }

  private clearBuffer(): void {
    this.buffer = "";
    this.isBuffering = false;
  }

  flush(): string {
    const remaining = this.buffer;
    this.clearBuffer();
    return remaining;
  }
}

export const markdownJoinerTransform = () => {
  const joiner = new MarkdownJoiner();

  return new TransformStream<
    TextStreamPart<{}>,
    TextStreamPart<{}>
  >({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") {
          const processedText = joiner.processText(
            chunk.textDelta,
          );
          if (processedText) {
            controller.enqueue({
              ...chunk,
              textDelta: processedText,
            });
          }
        } else {
          controller.enqueue(chunk);
        }
      },
      flush(controller) {
        const remaining = joiner.flush();
        if (remaining) {
          controller.enqueue({
            type: "text-delta",
            textDelta: remaining,
          } as TextStreamPart<{}>);
        }
      },
    });
  }; 