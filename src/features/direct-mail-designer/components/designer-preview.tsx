"use client";

import { useRef, useEffect } from "react";
import type { LobFormat } from "../types";

interface DesignerPreviewProps {
  html: string;
  format: LobFormat;
}

export function DesignerPreview({ html, format }: DesignerPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto bg-zinc-950 p-4">
      <div
        className="border border-zinc-700 bg-white shadow-lg"
        style={{ width: format.width, height: format.height }}
      >
        <iframe
          ref={iframeRef}
          sandbox="allow-same-origin"
          className="h-full w-full border-0"
          title="Template preview"
        />
      </div>
    </div>
  );
}
