"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteChatButton } from "./delete-chat-button";

interface ChatListProps {
  initialChats: Array<{
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  currentChatId?: string;
  isAuthenticated: boolean;
}

export function ChatList({ initialChats, currentChatId, isAuthenticated }: ChatListProps) {
  const [chats, setChats] = useState(initialChats);
  const router = useRouter();

  const handleDeleteChat = (chatId: string) => {
    // Remove chat from local state immediately
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    
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
            className="block p-3 pr-10 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg truncate"
          >
            {chat.title}
          </Link>
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
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