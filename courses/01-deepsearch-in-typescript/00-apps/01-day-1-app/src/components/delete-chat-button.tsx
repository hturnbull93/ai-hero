"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DeleteChatButtonProps {
  chatId: string;
  onDelete: (chatId: string) => void;
}

export function DeleteChatButton({ chatId, onDelete }: DeleteChatButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation from the parent Link
    e.stopPropagation(); // Stop event from bubbling up
    
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      const response = await fetch("/api/chat/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error: string };
        throw new Error(errorData.error || "Failed to delete chat");
      }

      // Call the onDelete callback to remove from UI immediately
      onDelete(chatId);
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete chat");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-red-600/20 text-gray-400 hover:text-red-400 disabled:opacity-50"
      title="Delete chat"
      aria-label="Delete chat"
    >
      <Trash2 className="size-4" />
    </button>
  );
} 