"use client";

import { RouteGuard } from "@/components/route-guard";
import { TAMExploreTab } from "@/features/tam/components/tam-explore-tab";

export default function ExplorePage() {
  return (
    <RouteGuard permission="tam.view">
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-white">Explore</h1>
        <p className="mt-1 text-zinc-400">
          Filter the universe and preview a segment before you export.
        </p>
        <div className="mt-6">
          <TAMExploreTab />
        </div>
      </div>
    </RouteGuard>
  );
}
