export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatContextType {
  chats: Chat[];
  addChat: (chat: Chat) => void;
  removeChat: (chatId: string) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
} 