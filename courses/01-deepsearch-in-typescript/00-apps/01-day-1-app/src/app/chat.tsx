"use client";

import { useChat } from "@ai-sdk/react";
import { Loader2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { isNewChatCreated } from "~/utils";
import type { Message } from "ai";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string;
  isNewChat: boolean;
  initialMessages: Message[] | undefined;
}

export const ChatPage = ({ userName, isAuthenticated, chatId, isNewChat, initialMessages }: ChatProps) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showError, setShowError] = useState(false);
  const router = useRouter();
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    data
  } = useChat({
    initialMessages,
    body: {
      chatId,
      isNewChat,
    },
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

  // Listen for new chat creation and redirect
  useEffect(() => {
    const lastDataItem = data?.[data.length - 1];

    if (lastDataItem && isNewChatCreated(lastDataItem)) {
      
      // More robust redirect with error handling
      try {
        router.push(`?id=${lastDataItem.chatId}`);
      } catch (error) {
        console.error('Failed to redirect to new chat:', error);
        // Fallback: Try to refresh the page with the new chat ID
        window.location.href = `?id=${lastDataItem.chatId}`;
      }
    }
  }, [data, router]);

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
        <div
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
          role="log"
          aria-label="Chat messages"
        >
          {messages.map((message, index) => {
            return (
              <ChatMessage
                key={index}
                message={message}
                userName={userName}
              />
            );
          })}
        </div>

        {/* Error display */}
        {error && showError && (
          <div className="mx-auto w-full max-w-[65ch] px-4 pb-4">
            <div className="flex items-center justify-between rounded bg-red-900/50 border border-red-700 px-4 py-3 text-red-200">
              <span className="text-sm">{error.message}</span>
              <button
                onClick={dismissError}
                className="text-red-300 hover:text-red-100"
                aria-label="Dismiss error"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-gray-700">
          <form
            onSubmit={onSubmit}
            className="mx-auto max-w-[65ch] p-4"
          >
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
                {status === "submitted" || status === "streaming" ? <Loader2 className="size-4 animate-spin" /> : "Send"}
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
