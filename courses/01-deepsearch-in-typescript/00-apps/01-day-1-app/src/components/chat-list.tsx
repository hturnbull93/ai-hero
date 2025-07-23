"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteChatButton } from "./delete-chat-button";
import { useChatContext } from "./chat-context";

interface ChatListProps {
  currentChatId?: string;
  isAuthenticated: boolean;
}

export function ChatList({ currentChatId, isAuthenticated }: ChatListProps) {
  const { chats, removeChat } = useChatContext();
  const router = useRouter();

  const handleDeleteChat = (chatId: string) => {
    // Remove chat from context state immediately
    removeChat(chatId);
    
    // If we're deleting the currently active chat, redirect to home
    if (chatId === currentChatId) {
      router.push("/");
    }
  };

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-gray-500">
        Sign in to start chatting
      </p>
    );
  }

  if (chats.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No chats yet. Start a new conversation!
      </p>
    );
  }

  return (
    <>
      {chats.map((chat) => (
        <div key={chat.id} className={`group relative rounded-lg ${
          chat.id === currentChatId
            ? "bg-gray-700"
            : "hover:bg-gray-750 bg-gray-800"
        }`}>
          <Link
            href={`/?id=${chat.id}`}
            className="block p-3 pr-10 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg break-words"
          >
            {chat.title}
          </Link>
          <div className="absolute right-2 top-2">
            <DeleteChatButton 
              chatId={chat.id} 
              onDelete={handleDeleteChat}
            />
          </div>
        </div>
      ))}
    </>
  );
} 