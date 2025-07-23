"use client";

import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { StickToBottom } from "use-stick-to-bottom";
import { useChatContext } from "~/components/chat-context";
import { ChatMessage } from "~/components/chat-message";
import { ErrorMessage } from "~/components/error-message";
import { SignInModal } from "~/components/sign-in-modal";
import { useAutoResume } from "~/use-auto-resume";
import { isNewChatCreated, isTitleUpdated } from "~/utils";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string;
  isNewChat: boolean;
  initialMessages: Message[] | undefined;
}

export const ChatPage = ({
  userName,
  isAuthenticated,
  chatId,
  isNewChat,
  initialMessages,
}: ChatProps) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showError, setShowError] = useState(false);
  const router = useRouter();
  const { addChat, updateChat } = useChatContext();
  const hasHandledNewChat = useRef(false);
  const processedTitleUpdates = useRef<Set<string>>(new Set());

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    data,
    setMessages,
    experimental_resume,
  } = useChat({
    id: chatId,
    initialMessages,
    body: {
      chatId,
      isNewChat,
    },
  });

  useAutoResume({
    autoResume: true,
    initialMessages: initialMessages ?? [],
    experimental_resume,
    data,
    setMessages,
  });

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  // Listen for new chat creation and redirect (only once per chat creation)
  useEffect(() => {
    // Only handle this for new chats, and only once
    if (!isNewChat || !data?.length || hasHandledNewChat.current) return;

    const lastDataItem = data[data.length - 1];

    if (lastDataItem && isNewChatCreated(lastDataItem)) {
      hasHandledNewChat.current = true; // Mark as handled to prevent re-runs

      // Add the new chat to the context
      addChat({
        id: lastDataItem.chatId,
        title: "Generating...",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // More robust redirect with error handling
      try {
        router.push(`?id=${lastDataItem.chatId}`);
      } catch (error) {
        console.error("Failed to redirect to new chat:", error);
        // Fallback: Try to refresh the page with the new chat ID
        window.location.href = `?id=${lastDataItem.chatId}`;
      }
    }
  }, [data, router, addChat, isNewChat]);

  // Listen for title updates
  useEffect(() => {
    if (!data?.length) return;

    // Process all data items but only update if we haven't processed this title update before
    data.forEach((dataItem) => {
      if (isTitleUpdated(dataItem)) {
        const titleUpdateKey = `${dataItem.chatId}-${dataItem.title}`;
        if (!processedTitleUpdates.current.has(titleUpdateKey)) {
          processedTitleUpdates.current.add(titleUpdateKey);
          updateChat(dataItem.chatId, {
            title: dataItem.title,
            updatedAt: new Date(),
          });
        }
      }
    });
  }, [data, updateChat]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    handleSubmit(e);
  };

  const dismissError = () => {
    setShowError(false);
  };

  return (
    <>
      <div className="flex flex-1 flex-col">
        <StickToBottom
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-auto [&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-800 [&>div]:scrollbar-thumb-gray-600 [&>div]:hover:scrollbar-thumb-gray-500"
          resize="smooth"
          initial="smooth"
          role="log"
          aria-label="Chat messages"
        >
          <StickToBottom.Content className="flex flex-col gap-0 p-4">
            {messages.map((message, index) => {
              return (
                <ChatMessage
                  key={index}
                  message={message}
                  userName={userName}
                />
              );
            })}
          </StickToBottom.Content>
        </StickToBottom>

        {/* Error display */}
        {error && showError && (
          <div className="mx-auto w-full max-w-[65ch] p-4">
            <ErrorMessage message={error.message} onDismiss={dismissError} />
          </div>
        )}

        <div className="border-t border-gray-700">
          <form onSubmit={onSubmit} className="mx-auto max-w-[65ch] p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Say something..."
                autoFocus
                aria-label="Chat input"
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                disabled={status !== "ready"}
              />
              <button
                type="submit"
                disabled={status !== "ready"}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {status === "submitted" || status === "streaming" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};
