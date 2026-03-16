"use client";

import { ChatInterface } from "chat-package";

export default function ChatPage() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <ChatInterface cloudBaseUrl={process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!} />
    </div>
  );
}
