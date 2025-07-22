import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";
import { ReasoningSteps } from "./reasoning-steps";
import type { MessageAnnotation } from "~/types";
import { messageAnnotationSchema } from "~/types";

export type MessagePart = NonNullable<Message["parts"]>[number];

interface ChatMessageProps {
  message: Message;
  userName: string;
}

// Helper function to safely parse annotations using Zod
const parseAnnotations = (annotations: unknown[]): MessageAnnotation[] => {
  return annotations
    .map((annotation) => {
      try {
        return messageAnnotationSchema.parse(annotation);
      } catch {
        return null;
      }
    })
    .filter((annotation): annotation is MessageAnnotation => annotation !== null);
};

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

const ToolInvocation = ({ part }: { part: MessagePart & { type: "tool-invocation" } }) => {
  const { toolInvocation } = part;
  
  return (
    <div className="mb-4 rounded-lg bg-gray-700 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-blue-400">🔧 Tool Call</span>
        <span className="text-xs text-gray-400">{toolInvocation.toolName}</span>
      </div>
      
      {toolInvocation.state === "partial-call" && (
        <div className="text-sm text-gray-400">Calling...</div>
      )}
      
      {(toolInvocation.state === "call" || toolInvocation.state === "result") && (
        <div className="space-y-2">
          <div>
            <div className="text-xs text-gray-500 mb-1">Arguments:</div>
            <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
              {JSON.stringify(toolInvocation.args, null, 2)}
            </pre>
          </div>
          
          {toolInvocation.state === "result" && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Result:</div>
              <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                {JSON.stringify(toolInvocation.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MessagePartRenderer = ({ part }: { part: MessagePart }) => {
  switch (part.type) {
    case "text":
      return <Markdown>{part.text}</Markdown>;
    
    case "tool-invocation":
      return <ToolInvocation part={part} />;
    
    // We're not handling these parts as per the requirements
    case "reasoning":
    case "source":
    case "file":
    case "step-start":
    default:
      return null;
  }
};

export const ChatMessage = ({ message, userName }: ChatMessageProps) => {
  const isAI = message.role === "assistant";

  // Extract annotations from the message
  const annotations = message.annotations ? parseAnnotations(message.annotations) : [];

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        {/* Show reasoning steps for AI messages */}
        {isAI && annotations.length > 0 && (
          <ReasoningSteps annotations={annotations} />
        )}

        <div className="prose prose-invert max-w-none">
          {message.parts && message.parts.length > 0 ? (
            message.parts.map((part, index) => (
              <MessagePartRenderer key={index} part={part} />
            ))
          ) : (
            // Fallback to content if parts are not available
            <Markdown>{typeof message.content === "string" ? message.content : ""}</Markdown>
          )}
        </div>
      </div>
    </div>
  );
};
