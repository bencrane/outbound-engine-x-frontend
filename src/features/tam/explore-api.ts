/**
 * Explore segment execution via Data Engine X (Enigma-backed operation).
 * Requests go through `/api/dataengine/*` so the token stays server-side.
 */

export const EXPLORE_OPERATION_ID = "company.search.enigma.brands";

/** Allowed range for `input.limit` on Explore execute calls. */
export const EXPLORE_MIN_LIMIT = 1;
export const EXPLORE_MAX_LIMIT = 250;
export const EXPLORE_DEFAULT_PREVIEW_LIMIT = 10;

/**
 * Coerces a UI value into a safe integer limit for the API (always 1–250).
 * Non-numeric input falls back to {@link EXPLORE_DEFAULT_PREVIEW_LIMIT}.
 */
export function clampExploreLimit(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    return EXPLORE_DEFAULT_PREVIEW_LIMIT;
  }
  return Math.min(EXPLORE_MAX_LIMIT, Math.max(EXPLORE_MIN_LIMIT, Math.floor(n)));
}

export type ExploreEntityMode = "BRAND" | "OPERATING_LOCATION";

export interface ExploreExecuteRequestBody {
  operation_id: typeof EXPLORE_OPERATION_ID;
  entity_type: "company";
  input: Record<string, unknown>;
  org_id: string;
  company_id: string;
  persist: boolean;
}

export interface ExploreExecuteResponse {
  data?: {
    run_id?: string;
    operation_id?: string;
    status?: string;
    output?: {
      brands?: unknown[];
      locations?: unknown[];
      result_count?: number;
    };
  };
  /** Error from proxy or API */
  detail?: string;
}

export type ExplorePreviewRow = {
  name: string;
  address: string;
  msa: string;
};

function pickString(...vals: unknown[]): string {
  for (const v of vals) {
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function buildAddress(rec: Record<string, unknown>): string {
  const line1 = pickString(
    rec.street1,
    rec.street,
    rec.address_line_1,
    rec.line1,
    rec.primary_address
  );
  const line2 = pickString(rec.street2, rec.address_line_2);
  const cityStateZip = [
    pickString(rec.city),
    pickString(rec.state, rec.region, rec.state_code),
    pickString(rec.postal_code, rec.zip, rec.postal),
  ]
    .filter(Boolean)
    .join(" ");
  const parts = [line1, line2, cityStateZip].filter(Boolean);
  if (parts.length) return parts.join(", ");
  const single = pickString(rec.full_address, rec.address, rec.formatted_address);
  return single;
}

function buildMsa(rec: Record<string, unknown>): string {
  return pickString(
    rec.primary_msa,
    rec.msa,
    rec.metro_area,
    rec.metropolitan_statistical_area,
    [rec.city, rec.state].filter((x) => x != null && String(x).trim()).join(", ")
  );
}

export function exploreRecordToRow(
  rec: unknown,
  mode: "brands" | "locations"
): ExplorePreviewRow {
  const r = rec && typeof rec === "object" ? (rec as Record<string, unknown>) : {};
  const name =
    mode === "brands"
      ? pickString(r.brand_name, r.name, r.legal_name)
      : pickString(r.location_name, r.name, r.brand_name);
  const address = buildAddress(r);
  const msa = buildMsa(r);
  return {
    name: name || "—",
    address: address || "—",
    msa: msa || "—",
  };
}

export function buildExploreInput(params: {
  prompt: string;
  state: string;
  msa: string;
  city: string;
  zipCodes: string;
  revenueFrom: string;
  revenueTo: string;
  growthFrom: string;
  growthTo: string;
  status: string;
  entityType: ExploreEntityMode;
  limit: number;
}): Record<string, unknown> {
  const safeLimit = clampExploreLimit(params.limit);
  const input: Record<string, unknown> = {
    limit: safeLimit,
    entity_type: params.entityType,
  };

  const p = params.prompt.trim();
  if (p) input.prompt = p;

  const st = params.state.trim();
  if (st) input.state = st;

  const msa = params.msa.trim();
  if (msa) input.msa = msa;

  const city = params.city.trim();
  if (city) input.city = city;

  const z = params.zipCodes.trim();
  if (z) input.zip_codes = z;

  const rf = params.revenueFrom.trim();
  if (rf) input.annual_revenue_min = rf;

  const rt = params.revenueTo.trim();
  if (rt) input.annual_revenue_max = rt;

  const gf = params.growthFrom.trim();
  if (gf) input.annual_growth_min = gf;

  const gt = params.growthTo.trim();
  if (gt) input.annual_growth_max = gt;

  const status = params.status.trim();
  if (status) input.status = status;

  return input;
}

export async function executeExploreSegment(
  body: ExploreExecuteRequestBody
): Promise<ExploreExecuteResponse> {
  const res = await fetch("/api/dataengine/v1/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let json: ExploreExecuteResponse = {};
  try {
    json = (await res.json()) as ExploreExecuteResponse;
  } catch {
    json = { detail: "Invalid JSON response" };
  }

  if (!res.ok) {
    throw new Error(json.detail || res.statusText || `Request failed (${res.status})`);
  }

  return json;
}
