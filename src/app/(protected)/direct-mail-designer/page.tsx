"use client";

import { useCallback } from "react";
import { RouteGuard } from "@/components/route-guard";
import { useAuth } from "@/lib/auth-context";
import { useDesignerState } from "@/features/direct-mail-designer/hooks/use-designer-state";
import { DesignerChat } from "@/features/direct-mail-designer/components/designer-chat";
import { DesignerToolbar } from "@/features/direct-mail-designer/components/designer-toolbar";
import { DesignerPreview } from "@/features/direct-mail-designer/components/designer-preview";
import { MergeVariablesPanel } from "@/features/direct-mail-designer/components/merge-variables-panel";

export default function DirectMailDesignerPage() {
  const { user, orgs } = useAuth();

  const orgName = orgs.find((o) => o.org_id === user?.org_id)?.org_name || "Your Company";

  const brandConfig = {
    primaryColor: "#1a1a2e",
    secondaryColor: "#e94560",
    logoUrl: null,
    fontFamily: "Arial, sans-serif",
    orgName,
  };

  const state = useDesignerState(brandConfig);

  const handleHtmlExtracted = useCallback(
    (html: string) => {
      state.updateHtml(html);
    },
    [state.updateHtml],
  );

  return (
    <RouteGuard permission="direct-mail.manage">
      <div className="flex h-screen">
        {/* Left panel — Chat */}
        <div className="w-[420px] shrink-0 border-r border-zinc-800">
          <DesignerChat
            activeFormat={state.activeFormat}
            activeSide={state.activeSide}
            currentHtml={state.currentHtml}
            brandConfig={state.brandConfig}
            onHtmlExtracted={handleHtmlExtracted}
          />
        </div>

        {/* Right panel — Toolbar + Preview + Merge Vars */}
        <div className="flex flex-1 flex-col">
          <DesignerToolbar
            activeFormat={state.activeFormat}
            onFormatChange={state.setActiveFormat}
            activeSide={state.activeSide}
            onSideChange={state.setActiveSide}
            currentHtml={state.currentHtml}
          />

          <DesignerPreview html={state.previewHtml} format={state.activeFormat} />

          <MergeVariablesPanel
            vars={state.mergeVars}
            values={state.mergeVarValues}
            onChange={state.setMergeVarValues}
          />
        </div>
      </div>
    </RouteGuard>
  );
}
