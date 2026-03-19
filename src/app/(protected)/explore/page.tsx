"use client";

import { RouteGuard } from "@/components/route-guard";
import { TAMExploreTab } from "@/features/tam/components/tam-explore-tab";

export default function ExplorePage() {
  return (
    <RouteGuard permission="tam.view">
      <div className="p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Explore</h1>
            <p className="mt-1 text-zinc-400">
              Filter the universe and preview a segment before you export.
            </p>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-zinc-500 sm:pt-1 sm:text-right">
            Enigma credits: ~1-2 per result (core), ~3-5 per result (with enrichment)
          </p>
        </div>
        <div className="mt-6">
          <TAMExploreTab />
        </div>
      </div>
    </RouteGuard>
  );
}
