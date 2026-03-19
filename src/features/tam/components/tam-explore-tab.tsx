"use client";

import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Crosshair,
  FileText,
  Info,
  Lock,
  MapPin,
  Maximize2,
  SlidersHorizontal,
  Store,
  Tag,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type PreviewEntity = "brands" | "locations";

const BRAND_ROWS = [
  {
    name: "REVIV TO THRIVE WELLNESS",
    address: "18753 SPRING ST HERMITAGE MO 65668",
    msa: "Houston-Pasadena-The Woodlands, TX",
  },
  {
    name: "ELITE AESTHETICS STUDIO",
    address: "4521 MARKET ST STE 200 PHILADELPHIA PA 19104",
    msa: "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD",
  },
  {
    name: "LUMIN SKIN + BODY",
    address: "8901 W SUNSET BLVD LOS ANGELES CA 90069",
    msa: "Los Angeles-Long Beach-Anaheim, CA",
  },
  {
    name: "NOVA MED SPA COLLECTIVE",
    address: "2100 N COLLINS ST ARLINGTON TX 76011",
    msa: "Dallas-Fort Worth-Arlington, TX",
  },
  {
    name: "VERVE CLINICAL WELLNESS",
    address: "155 E BRICKELL AVE MIAMI FL 33131",
    msa: "Miami-Fort Lauderdale-Pompano Beach, FL",
  },
] as const;

const LOCATION_ROWS = [
  {
    name: "DALLAS FLAGSHIP CLINIC",
    address: "4000 MCKINNEY AVE DALLAS TX 75204",
    msa: "Dallas-Fort Worth-Arlington, TX",
  },
  {
    name: "PHOENIX SCOTTSDALE OUTPOST",
    address: "7120 E INDIAN SCHOOL RD SCOTTSDALE AZ 85251",
    msa: "Phoenix-Mesa-Chandler, AZ",
  },
  {
    name: "AUSTIN DOMAIN LOCATION",
    address: "11410 DOMAIN DR AUSTIN TX 78758",
    msa: "Austin-Round Rock-San Marcos, TX",
  },
] as const;

const BRAND_COUNT = 8556;
const LOCATION_COUNT = 10177;
const FILTER_LIMIT = 200;

function FilterSection({
  title,
  activeCount,
  locked,
  defaultOpen = true,
  children,
  onClearActive,
}: {
  title: string;
  activeCount: number;
  locked?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  onClearActive?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {locked ? <Lock className="size-3.5 shrink-0 text-zinc-500" /> : null}
        <span className="flex-1 text-sm font-medium text-zinc-200">{title}</span>
        {activeCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            {activeCount} Active
            {onClearActive ? (
              <span
                role="button"
                tabIndex={0}
                className="ml-0.5 rounded p-0.5 hover:bg-amber-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearActive();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onClearActive();
                  }
                }}
              >
                <X className="size-3" />
              </span>
            ) : null}
          </span>
        ) : null}
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-zinc-500" />
        )}
      </button>
      {open ? <div className="border-t border-zinc-800/80 px-3 pb-3 pt-2">{children}</div> : null}
    </div>
  );
}

export function TAMExploreTab() {
  const [industryChip, setIndustryChip] = useState("Medical Spa");
  const [revenueActive, setRevenueActive] = useState(true);
  const [statusActive, setStatusActive] = useState(true);

  const appliedFilterCount = useMemo(() => {
    let n = industryChip ? 1 : 0;
    if (revenueActive) n += 1;
    if (statusActive) n += 1;
    return n;
  }, [industryChip, revenueActive, statusActive]);

  const [previewEntity, setPreviewEntity] = useState<PreviewEntity>("brands");
  const rows = previewEntity === "brands" ? BRAND_ROWS : LOCATION_ROWS;
  const previewCount = previewEntity === "brands" ? BRAND_COUNT : LOCATION_COUNT;

  return (
    <div className="flex min-h-[min(720px,calc(100vh-12rem))] flex-col gap-6 lg:flex-row lg:items-stretch">
      {/* Filters sidebar */}
      <aside className="flex w-full flex-col gap-3 lg:w-[min(100%,380px)] lg:shrink-0">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100">Filters</h2>
          <span className="text-xs text-zinc-500">
            {appliedFilterCount}/{FILTER_LIMIT}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
          <FilterSection
            title="Industry"
            activeCount={industryChip ? 1 : 0}
            locked
            defaultOpen
            onClearActive={industryChip ? () => setIndustryChip("") : undefined}
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {industryChip ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/45 bg-blue-600/20 px-2 py-1 text-xs font-medium text-blue-300">
                    {industryChip}
                  </span>
                ) : null}
                <span className="text-xs text-zinc-500">
                  {industryChip ? `${formatNumber(4786)} total` : "Search to add industries"}
                </span>
              </div>
              <Input placeholder="Search industries…" className="h-8 text-xs" />
            </div>
          </FilterSection>

          <FilterSection title="Location" activeCount={0} defaultOpen>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-zinc-500">States</Label>
                <Input placeholder="e.g. New York" className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Metropolitan Statistical Areas</Label>
                <Input placeholder="Search MSAs…" className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Cities</Label>
                <Input placeholder="City" className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Zip Codes</Label>
                <Input placeholder="Comma-separated zips" className="mt-1 h-8 text-xs" />
              </div>
            </div>
          </FilterSection>

          <FilterSection
            title="Card Revenue"
            activeCount={revenueActive ? 1 : 0}
            defaultOpen
            onClearActive={revenueActive ? () => setRevenueActive(false) : undefined}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-400">Annual Revenue</Label>
                <Badge variant="outline" className="border-zinc-600 text-[10px] text-zinc-500">
                  12m
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="From" className="h-8 text-xs" type="text" />
                <Input placeholder="To" className="h-8 text-xs" type="text" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-400">Annual Growth Rate %</Label>
                <Badge variant="outline" className="border-zinc-600 text-[10px] text-zinc-500">
                  12m
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="From %" className="h-8 text-xs" />
                <Input placeholder="To %" className="h-8 text-xs" />
              </div>
            </div>
          </FilterSection>

          <FilterSection
            title="Status"
            activeCount={statusActive ? 1 : 0}
            defaultOpen={false}
            onClearActive={statusActive ? () => setStatusActive(false) : undefined}
          >
            <p className="text-xs text-zinc-500">Refine by operating or historical status.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                Operating
              </span>
              <span className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-500">
                Closed
              </span>
            </div>
          </FilterSection>
        </div>

        <div className="mt-auto flex gap-2 border-t border-zinc-800/80 pt-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 border border-zinc-700 bg-zinc-900"
            onClick={() => {
              setIndustryChip("");
              setRevenueActive(false);
              setStatusActive(false);
            }}
          >
            <X className="size-4" />
            Reset
          </Button>
          <Button type="button" className="flex-1">
            Generate
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </aside>

      {/* Preview */}
      <section className="flex min-w-0 flex-1 flex-col rounded-lg border border-zinc-800/80 bg-black/40">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
          <div className="flex items-center gap-2 text-zinc-100">
            <FileText className="size-4 text-zinc-400" />
            <h2 className="text-sm font-semibold tracking-wide">Preview</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-200">
              <Maximize2 className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-200">
              <SlidersHorizontal className="size-4" />
            </Button>
          </div>
        </div>

        <div className="border-b border-zinc-800/80 px-4 py-3">
          <div className="inline-flex rounded-full border border-zinc-800 bg-zinc-950/60 p-0.5">
            <button
              type="button"
              onClick={() => setPreviewEntity("brands")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                previewEntity === "brands"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Tag className="size-3.5" />
              Brands
              <span className="tabular-nums text-zinc-400">{formatNumber(BRAND_COUNT)}</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewEntity("locations")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                previewEntity === "locations"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Store className="size-3.5" />
              Operating Locations
              <span className="tabular-nums text-zinc-400">{formatNumber(LOCATION_COUNT)}</span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800/80 hover:bg-transparent">
                <TableHead className="w-[32%] whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    Name
                    <Info className="size-3 text-zinc-600" />
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    Primary address
                    <Info className="size-3 text-zinc-600" />
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    Primary MSA
                    <Info className="size-3 text-zinc-600" />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow
                  key={`${previewEntity}-${row.name}-${i}`}
                  className={cn(
                    "border-zinc-800/80",
                    i % 2 === 1 ? "bg-zinc-950/70" : "bg-transparent"
                  )}
                >
                  <TableCell className="align-middle font-medium uppercase tracking-wide text-white">
                    <span className="inline-flex w-full items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{row.name}</span>
                      <Tag className="size-3.5 shrink-0 text-zinc-600" />
                    </span>
                  </TableCell>
                  <TableCell className="align-middle uppercase tracking-wide text-zinc-200">
                    <span className="inline-flex w-full items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{row.address}</span>
                      <MapPin className="size-3.5 shrink-0 text-zinc-600" />
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-zinc-400">
                    <span className="inline-flex w-full items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{row.msa}</span>
                      <Crosshair className="size-3.5 shrink-0 text-zinc-600" />
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span>
              Page size: <span className="text-zinc-300">50</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span>
              1 to {rows.length} of {formatNumber(previewCount)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Button type="button" variant="ghost" size="sm" disabled className="h-7 text-zinc-600">
              First
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled className="h-7 text-zinc-600">
              Previous
            </Button>
            <span className="px-2 text-zinc-400">Page 1 of 1</span>
            <Button type="button" variant="ghost" size="sm" disabled className="h-7 text-zinc-600">
              Next
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled className="h-7 text-zinc-600">
              Last
            </Button>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 p-4">
          <Button type="button" className="h-10 w-full text-sm font-medium">
            Generate full segment file
            <ArrowRight className="size-4" />
          </Button>
          <p className="mt-2 text-center text-[11px] text-zinc-600">
            Showing sample rows — connect filters to your data source when the API is available.
          </p>
        </div>
      </section>
    </div>
  );
}
