"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ChatContextType, Chat } from "~/types";

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
  initialChats: Chat[];
}

export function ChatProvider({ children, initialChats }: ChatProviderProps) {
  const [chats, setChats] = useState<Chat[]>(initialChats);

  const addChat = (newChat: Chat) => {
    setChats(prevChats => {
      // Check if chat already exists to avoid duplicates
      const exists = prevChats.some(chat => chat.id === newChat.id);
      if (exists) {
        return prevChats;
      }
      // Add new chat at the beginning (most recent first)
      return [newChat, ...prevChats];
    });
  };

  const removeChat = (chatId: string) => {
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
  };

  const updateChat = (chatId: string, updates: Partial<Chat>) => {
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId ? { ...chat, ...updates } : chat
      )
    );
  };

  const value: ChatContextType = {
    chats,
    addChat,
    removeChat,
    updateChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
} 