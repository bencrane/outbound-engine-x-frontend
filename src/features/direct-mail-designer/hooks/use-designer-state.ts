import { useState, useCallback, useMemo } from "react";
import type { LobFormat, BrandConfig } from "../types";
import { DEFAULT_FORMAT } from "../lib/formats";
import { parseMergeVars } from "../lib/merge-var-parser";

const STARTER_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;">
  <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
    <p style="font-size:24px;color:#333;">Your design here</p>
  </div>
</body>
</html>`;

function buildInitialHtml(format: LobFormat): Record<string, string> {
  const html: Record<string, string> = {};
  for (const surface of format.surfaces) {
    html[surface.id] = STARTER_HTML;
  }
  return html;
}

export function useDesignerState(initialBrand: BrandConfig) {
  const [activeFormat, setActiveFormatRaw] = useState<LobFormat>(DEFAULT_FORMAT);
  const [templateHtml, setTemplateHtml] = useState<Record<string, string>>(
    () => buildInitialHtml(DEFAULT_FORMAT),
  );
  const [activeSide, setActiveSide] = useState<string>(DEFAULT_FORMAT.surfaces[0].id);
  const [brandConfig] = useState<BrandConfig>(initialBrand);

  const setActiveFormat = useCallback((format: LobFormat) => {
    setActiveFormatRaw(format);
    setTemplateHtml(buildInitialHtml(format));
    setActiveSide(format.surfaces[0].id);
  }, []);

  const currentHtml = templateHtml[activeSide] ?? STARTER_HTML;

  const mergeVars = useMemo(() => parseMergeVars(currentHtml), [currentHtml]);
  const [mergeVarValues, setMergeVarValues] = useState<Record<string, string>>({});

  const updateHtml = useCallback(
    (html: string) => {
      setTemplateHtml((prev) => ({ ...prev, [activeSide]: html }));
    },
    [activeSide],
  );

  /** HTML with merge vars substituted for preview display */
  const previewHtml = useMemo(() => {
    let html = currentHtml;
    for (const v of mergeVars) {
      const val = mergeVarValues[v] || `{{${v}}}`;
      html = html.replaceAll(`{{${v}}}`, val);
    }
    return html;
  }, [currentHtml, mergeVars, mergeVarValues]);

  /** The active surface definition from the scaffold */
  const activeSurface = activeFormat.surfaces.find((s) => s.id === activeSide) ?? activeFormat.surfaces[0];

  return {
    templateHtml,
    activeSide,
    setActiveSide,
    activeSurface,
    activeFormat,
    setActiveFormat,
    currentHtml,
    updateHtml,
    previewHtml,
    mergeVars,
    mergeVarValues,
    setMergeVarValues,
    brandConfig,
  };
}
