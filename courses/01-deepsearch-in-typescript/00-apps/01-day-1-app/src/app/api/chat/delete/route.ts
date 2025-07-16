import { auth } from "~/server/auth";
import { deleteChat } from "~/server/db/queries";

export async function DELETE(request: Request) {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { chatId } = await request.json() as { chatId: string };

    if (!chatId) {
      return new Response("Chat ID is required", { status: 400 });
    }

    // Delete the chat
    await deleteChat(chatId, session.user.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Failed to delete chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 