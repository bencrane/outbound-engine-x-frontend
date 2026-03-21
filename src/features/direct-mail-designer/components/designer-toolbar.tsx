"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { LOB_FORMATS } from "../lib/formats";
import type { LobFormat } from "../types";

interface DesignerToolbarProps {
  activeFormat: LobFormat;
  onFormatChange: (format: LobFormat) => void;
  activeSide: string;
  onSideChange: (side: string) => void;
  currentHtml: string;
}

export function DesignerToolbar({
  activeFormat,
  onFormatChange,
  activeSide,
  onSideChange,
  currentHtml,
}: DesignerToolbarProps) {
  const copyHtml = () => {
    navigator.clipboard.writeText(currentHtml);
  };

  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2">
      {/* Format selector */}
      <Select
        value={activeFormat.id}
        onChange={(e) => {
          const fmt = LOB_FORMATS.find((f) => f.id === e.target.value);
          if (fmt) onFormatChange(fmt);
        }}
      >
        {LOB_FORMATS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </Select>

      {/* Surface toggle — dynamic labels from scaffold */}
      <div className="flex rounded-md border border-zinc-700">
        {activeFormat.surfaces.map((surface) => (
          <button
            key={surface.id}
            className={`px-3 py-1 text-sm ${activeSide === surface.id ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
            onClick={() => onSideChange(surface.id)}
          >
            {surface.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Copy HTML */}
      <Button variant="outline" size="sm" onClick={copyHtml}>
        Copy HTML
      </Button>

      {/* Push to Lob (future) */}
      <Button size="sm" disabled title="Coming soon">
        Push to Lob
      </Button>
    </div>
  );
}
