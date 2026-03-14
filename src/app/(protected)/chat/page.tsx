"use client";

import { ChatInterface } from "chat-package";
import "chat-package/index.css";

export default function ChatPage() {
  return (
    <div className="flex-1 h-full w-full overflow-hidden">
      <ChatInterface />
    </div>
  );
}
