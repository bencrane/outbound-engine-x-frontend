"use client";

import { useEffect, useRef, useMemo } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@assistant-ui/react-ui";
import { useThread } from "@assistant-ui/react";
import type { LobFormat, BrandConfig } from "../types";
import { extractHtmlFromResponse } from "../lib/html-extractor";

interface DesignerChatProps {
  activeFormat: LobFormat;
  activeSide: string;
  currentHtml: string;
  brandConfig: BrandConfig;
  onHtmlExtracted: (html: string) => void;
}

function HtmlExtractor({
  onHtmlExtracted,
}: {
  onHtmlExtracted: (html: string) => void;
}) {
  const messages = useThread((s) => s.messages);
  const lastExtractedRef = useRef<string | null>(null);

  useEffect(() => {
    if (messages.length === 0) return;

    // Find the last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== "assistant") continue;

      // Build the full text from content parts
      const text = msg.content
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join("");

      if (!text) break;

      const html = extractHtmlFromResponse(text);
      if (html && html !== lastExtractedRef.current) {
        lastExtractedRef.current = html;
        onHtmlExtracted(html);
      }
      break;
    }
  }, [messages, onHtmlExtracted]);

  return null;
}

export function DesignerChat({
  activeFormat,
  activeSide,
  currentHtml,
  brandConfig,
  onHtmlExtracted,
}: DesignerChatProps) {
  const contextRef = useRef({ activeFormat, activeSide, currentHtml, brandConfig });
  useEffect(() => {
    contextRef.current = { activeFormat, activeSide, currentHtml, brandConfig };
  });

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/chat/designer",
        body: () => ({
          formatId: contextRef.current.activeFormat.id,
          side: contextRef.current.activeSide,
          currentHtml: contextRef.current.currentHtml,
          brandConfig: contextRef.current.brandConfig,
        }),
      }),
    [],
  );

  const runtime = useChatRuntime({ transport });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="aui-root dark flex h-full flex-col bg-background text-foreground">
        <Thread />
        <HtmlExtractor onHtmlExtracted={onHtmlExtracted} />
      </div>
    </AssistantRuntimeProvider>
  );
}
