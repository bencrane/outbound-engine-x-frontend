"use client";

import { formatNumber } from "@/lib/format";

interface DeliveryFunnelItem {
  stage: string;
  count: number;
}

interface DeliveryFunnelProps {
  items: DeliveryFunnelItem[];
}

const STAGE_ORDER = ["created", "processing", "in_transit", "delivered"] as const;

export function DeliveryFunnel({ items }: DeliveryFunnelProps) {
  const sorted = sortStages(items);
  const firstStageCount = sorted[0]?.count ?? 0;
  const denominator = firstStageCount > 0 ? firstStageCount : Math.max(...sorted.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      {sorted.map((item) => {
        const widthPercent = Math.max((item.count / denominator) * 100, 2);
        return (
          <div key={item.stage} className="grid grid-cols-[120px_1fr_84px] items-center gap-3">
            <p className="text-sm text-zinc-300">{humanize(item.stage)}</p>
            <div className="h-6 rounded-sm bg-zinc-800">
              <div className="h-6 rounded-sm bg-blue-600" style={{ width: `${widthPercent}%` }} />
            </div>
            <p className="text-right text-sm font-medium text-white">{formatNumber(item.count)}</p>
          </div>
        );
      })}
    </div>
  );
}

function sortStages(items: DeliveryFunnelItem[]) {
  const order = new Map<string, number>(STAGE_ORDER.map((stage, index) => [stage, index]));
  return [...items].sort((a, b) => {
    const aIndex = order.get(a.stage) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = order.get(b.stage) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex === bIndex) {
      return a.stage.localeCompare(b.stage);
    }
    return aIndex - bIndex;
  });
}

function humanize(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
