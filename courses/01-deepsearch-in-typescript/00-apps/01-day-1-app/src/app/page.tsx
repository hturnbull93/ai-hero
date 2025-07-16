import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { auth } from "~/server/auth/index.ts";
import { ChatPage } from "./chat.tsx";
import { AuthButton } from "../components/auth-button.tsx";
import { ChatList } from "../components/chat-list.tsx";
import { getChats, getChat } from "~/server/db/queries.ts";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await auth();
  const userName = session?.user?.name ?? "Guest";
  const isAuthenticated = !!session?.user;
  const userId = session?.user?.id;

  // Generate stable chatId - use URL id or create new one
  const chatId = id ?? crypto.randomUUID();
  const isNewChat = !id;

  // Fetch chats if user is authenticated
  const chats = isAuthenticated && userId ? await getChats(userId) : [];
  
  // Fetch specific chat if there's an ID and user is authenticated
  const currentChat = isAuthenticated && userId && id ? await getChat(id, userId) : null;
  const initialMessages = currentChat?.messages;

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-900">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">Your Chats</h2>
            {isAuthenticated && (
              <Link
                href="/"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="New Chat"
              >
                <PlusIcon className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
        <div className="-mt-1 flex-1 space-y-2 overflow-y-auto px-4 pt-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
          <ChatList 
            initialChats={chats}
            currentChatId={id}
            isAuthenticated={isAuthenticated}
          />
        </div>
        <div className="p-4">
          <AuthButton
            isAuthenticated={isAuthenticated}
            userImage={session?.user?.image}
          />
        </div>
      </div>

      <ChatPage 
        key={chatId}
        userName={userName} 
        isAuthenticated={isAuthenticated} 
        chatId={chatId}
        isNewChat={isNewChat}
        initialMessages={initialMessages}
      />
    </div>
  );
}
