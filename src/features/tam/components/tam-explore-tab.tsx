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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useCompanyContext } from "@/lib/company-context";
import {
  buildExploreInput,
  clampExploreLimit,
  executeExploreSegment,
  exploreRecordToRow,
  EXPLORE_DEFAULT_PREVIEW_LIMIT,
  EXPLORE_MAX_LIMIT,
  EXPLORE_MIN_LIMIT,
  EXPLORE_OPERATION_ID,
  type ExploreEntityMode,
  type ExploreExecuteRequestBody,
  type ExplorePreviewRow,
} from "@/features/tam/explore-api";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type PreviewEntity = "brands" | "locations";

const FILTER_BUDGET = 200;
const SEGMENT_DIALOG_DEFAULT = 50;

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
  const { user } = useAuth();
  const { selectedCompanyId, selectedCompany } = useCompanyContext();

  const [industry, setIndustry] = useState("Medical Spa");
  const [states, setStates] = useState("");
  const [msa, setMsa] = useState("");
  const [cities, setCities] = useState("");
  const [zipCodes, setZipCodes] = useState("");
  const [revenueFrom, setRevenueFrom] = useState("");
  const [revenueTo, setRevenueTo] = useState("");
  const [growthFrom, setGrowthFrom] = useState("");
  const [growthTo, setGrowthTo] = useState("");
  const [status, setStatus] = useState<"" | "operating" | "closed">("");

  const [previewEntity, setPreviewEntity] = useState<PreviewEntity>("brands");
  const [brandsRows, setBrandsRows] = useState<ExplorePreviewRow[]>([]);
  const [locationsRows, setLocationsRows] = useState<ExplorePreviewRow[]>([]);
  const [brandsCount, setBrandsCount] = useState(0);
  const [locationsCount, setLocationsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRunLimit, setLastRunLimit] = useState(EXPLORE_DEFAULT_PREVIEW_LIMIT);
  const [maxResults, setMaxResults] = useState(EXPLORE_DEFAULT_PREVIEW_LIMIT);
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [segmentLimitInput, setSegmentLimitInput] = useState(String(SEGMENT_DIALOG_DEFAULT));

  const appliedFilterCount = useMemo(() => {
    let n = 0;
    if (industry.trim()) n += 1;
    if (states.trim()) n += 1;
    if (msa.trim()) n += 1;
    if (cities.trim()) n += 1;
    if (zipCodes.trim()) n += 1;
    if (revenueFrom.trim() || revenueTo.trim()) n += 1;
    if (growthFrom.trim() || growthTo.trim()) n += 1;
    if (status) n += 1;
    return n;
  }, [
    industry,
    states,
    msa,
    cities,
    zipCodes,
    revenueFrom,
    revenueTo,
    growthFrom,
    growthTo,
    status,
  ]);

  const entityTypeForPreview = (): ExploreEntityMode =>
    previewEntity === "brands" ? "BRAND" : "OPERATING_LOCATION";

  const rows = previewEntity === "brands" ? brandsRows : locationsRows;
  const previewCount = previewEntity === "brands" ? brandsCount : locationsCount;

  const effectiveCompanyId = user?.company_id ?? selectedCompanyId;
  const companyLabel = selectedCompany?.name ?? "selected company";

  const runExecute = async (limit: number) => {
    const safeLimit = clampExploreLimit(limit);
    setError(null);
    if (!user?.org_id) {
      setError("You must be signed in to run Explore.");
      return;
    }
    if (!effectiveCompanyId) {
      setError(
        "Select a client company in the sidebar (not “All Companies”) before generating a segment."
      );
      return;
    }

    const input = buildExploreInput({
      prompt: industry,
      state: states,
      msa,
      city: cities,
      zipCodes,
      revenueFrom,
      revenueTo,
      growthFrom,
      growthTo,
      status,
      entityType: entityTypeForPreview(),
      limit: safeLimit,
    });

    const body = {
      operation_id: EXPLORE_OPERATION_ID,
      entity_type: "company" as const,
      input,
      org_id: user.org_id,
      company_id: effectiveCompanyId,
      persist: true,
    } satisfies ExploreExecuteRequestBody;

    const json = await executeExploreSegment(body);
    const out = json.data?.output;
    const count = out?.result_count ?? 0;

    if (previewEntity === "brands") {
      const list = out?.brands ?? [];
      setBrandsRows(list.map((r) => exploreRecordToRow(r, "brands")));
      setBrandsCount(count || list.length);
    } else {
      const list = out?.locations ?? [];
      setLocationsRows(list.map((r) => exploreRecordToRow(r, "locations")));
      setLocationsCount(count || list.length);
    }
    setLastRunLimit(safeLimit);
  };

  const performGenerateAfterConfirm = async () => {
    const limit = clampExploreLimit(maxResults);
    setIsLoading(true);
    try {
      await runExecute(limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const performFullSegmentAfterConfirm = async () => {
    const raw =
      segmentLimitInput.trim() === "" ? SEGMENT_DIALOG_DEFAULT : segmentLimitInput;
    const limit = clampExploreLimit(raw);
    setIsLoading(true);
    try {
      await runExecute(limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const clearIndustry = () => setIndustry("");

  return (
    <div className="flex min-h-[min(720px,calc(100vh-12rem))] flex-col gap-6 lg:flex-row lg:items-stretch">
      <aside className="flex w-full flex-col gap-3 lg:w-[min(100%,380px)] lg:shrink-0">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100">Filters</h2>
          <span className="text-xs text-zinc-500">
            {appliedFilterCount}/{FILTER_BUDGET}
          </span>
        </div>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
          <FilterSection
            title="Industry"
            activeCount={industry.trim() ? 1 : 0}
            locked
            defaultOpen
            onClearActive={industry.trim() ? clearIndustry : undefined}
          >
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Industry / prompt</Label>
              <Input
                placeholder="e.g. Medical Spa"
                className="h-8 text-xs"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
          </FilterSection>

          <FilterSection title="Location" activeCount={[states, msa, cities, zipCodes].some((s) => s.trim()) ? 1 : 0} defaultOpen>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-zinc-500">States</Label>
                <Input
                  placeholder="e.g. NY, CA or New York"
                  className="mt-1 h-8 text-xs"
                  value={states}
                  onChange={(e) => setStates(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Metropolitan Statistical Areas</Label>
                <Input
                  placeholder="Search MSAs…"
                  className="mt-1 h-8 text-xs"
                  value={msa}
                  onChange={(e) => setMsa(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Cities</Label>
                <Input
                  placeholder="City"
                  className="mt-1 h-8 text-xs"
                  value={cities}
                  onChange={(e) => setCities(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Zip Codes</Label>
                <Input
                  placeholder="Comma-separated zips"
                  className="mt-1 h-8 text-xs"
                  value={zipCodes}
                  onChange={(e) => setZipCodes(e.target.value)}
                />
              </div>
            </div>
          </FilterSection>

          <FilterSection
            title="Card Revenue"
            activeCount={
              revenueFrom.trim() || revenueTo.trim() || growthFrom.trim() || growthTo.trim()
                ? 1
                : 0
            }
            defaultOpen
            onClearActive={
              revenueFrom || revenueTo || growthFrom || growthTo
                ? () => {
                    setRevenueFrom("");
                    setRevenueTo("");
                    setGrowthFrom("");
                    setGrowthTo("");
                  }
                : undefined
            }
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-400">Annual Revenue</Label>
                <Badge variant="outline" className="border-zinc-600 text-[10px] text-zinc-500">
                  12m
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="From"
                  className="h-8 text-xs"
                  value={revenueFrom}
                  onChange={(e) => setRevenueFrom(e.target.value)}
                />
                <Input
                  placeholder="To"
                  className="h-8 text-xs"
                  value={revenueTo}
                  onChange={(e) => setRevenueTo(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-400">Annual Growth Rate %</Label>
                <Badge variant="outline" className="border-zinc-600 text-[10px] text-zinc-500">
                  12m
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="From %"
                  className="h-8 text-xs"
                  value={growthFrom}
                  onChange={(e) => setGrowthFrom(e.target.value)}
                />
                <Input
                  placeholder="To %"
                  className="h-8 text-xs"
                  value={growthTo}
                  onChange={(e) => setGrowthTo(e.target.value)}
                />
              </div>
            </div>
          </FilterSection>

          <FilterSection
            title="Status"
            activeCount={status ? 1 : 0}
            defaultOpen={false}
            onClearActive={status ? () => setStatus("") : undefined}
          >
            <p className="text-xs text-zinc-500">Refine by operating or historical status.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatus("operating")}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  status === "operating"
                    ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                )}
              >
                Operating
              </button>
              <button
                type="button"
                onClick={() => setStatus("closed")}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  status === "closed"
                    ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                )}
              >
                Closed
              </button>
            </div>
          </FilterSection>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-zinc-800/80 pt-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full border border-zinc-700 bg-zinc-900"
            disabled={isLoading}
            onClick={() => {
              setIndustry("");
              setStates("");
              setMsa("");
              setCities("");
              setZipCodes("");
              setRevenueFrom("");
              setRevenueTo("");
              setGrowthFrom("");
              setGrowthTo("");
              setStatus("");
              setBrandsRows([]);
              setLocationsRows([]);
              setBrandsCount(0);
              setLocationsCount(0);
              setError(null);
              setLastRunLimit(EXPLORE_DEFAULT_PREVIEW_LIMIT);
              setMaxResults(EXPLORE_DEFAULT_PREVIEW_LIMIT);
              setSegmentLimitInput(String(SEGMENT_DIALOG_DEFAULT));
            }}
          >
            <X className="size-4" />
            Reset
          </Button>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor="explore-max-results" className="text-xs text-zinc-500">
              Max Results
            </Label>
            <Input
              id="explore-max-results"
              type="number"
              min={EXPLORE_MIN_LIMIT}
              max={EXPLORE_MAX_LIMIT}
              step={1}
              className="h-9 text-xs"
              value={maxResults}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") return;
                const n = parseInt(raw, 10);
                if (Number.isNaN(n)) return;
                setMaxResults(n);
              }}
              onBlur={() => setMaxResults((m) => clampExploreLimit(m))}
            />
          </div>
          <Button
            type="button"
            className="h-9 shrink-0 px-4"
            disabled={isLoading}
            onClick={() => setGenerateConfirmOpen(true)}
          >
            Generate
            <ArrowRight className="size-4" />
          </Button>
        </div>
        </div>
      </aside>

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
              <span className="tabular-nums text-zinc-400">{formatNumber(brandsCount)}</span>
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
              <span className="tabular-nums text-zinc-400">{formatNumber(locationsCount)}</span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              Run Generate to preview results for {companyLabel}.
            </p>
          ) : (
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
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span>
              Page size: <span className="text-zinc-300">{lastRunLimit}</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span>
              {rows.length === 0
                ? "No rows"
                : `1 to ${rows.length} of ${formatNumber(previewCount)}`}
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
          <Button
            type="button"
            className="h-10 w-full text-sm font-medium"
            disabled={isLoading}
            onClick={() => {
              setSegmentLimitInput(String(SEGMENT_DIALOG_DEFAULT));
              setSegmentDialogOpen(true);
            }}
          >
            Generate full segment file
            <ArrowRight className="size-4" />
          </Button>
          <p className="mt-2 text-center text-[11px] text-zinc-600">
            Confirm max results (1–250) before running. Requires a company context in the sidebar.
          </p>
        </div>
      </section>

      <Dialog open={generateConfirmOpen} onOpenChange={setGenerateConfirmOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Enigma query</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will query Enigma for up to {clampExploreLimit(maxResults)} results (~
              {clampExploreLimit(maxResults) * 2} credits). Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="border border-zinc-700 bg-zinc-800"
              onClick={() => setGenerateConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setGenerateConfirmOpen(false);
                void performGenerateAfterConfirm();
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={segmentDialogOpen} onOpenChange={setSegmentDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">Full segment generation</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Full segment generation may use significant credits. Enter the number of results:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 px-5">
            <Label htmlFor="segment-max-results" className="text-xs text-zinc-500">
              Max Results
            </Label>
            <Input
              id="segment-max-results"
              type="number"
              min={EXPLORE_MIN_LIMIT}
              max={EXPLORE_MAX_LIMIT}
              step={1}
              className="h-9 text-white"
              value={segmentLimitInput}
              onChange={(e) => setSegmentLimitInput(e.target.value)}
              onBlur={() =>
                setSegmentLimitInput(String(clampExploreLimit(segmentLimitInput)))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="border border-zinc-700 bg-zinc-800"
              onClick={() => setSegmentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setSegmentDialogOpen(false);
                void performFullSegmentAfterConfirm();
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
