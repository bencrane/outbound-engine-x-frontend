// ---------------------------------------------------------------------------
// Scaffold schema — mirrors the JSON files from creative-engine-x-api
// ---------------------------------------------------------------------------

export interface ScaffoldZone {
  id: string;
  type: "warning" | "forbidden" | "reserved" | "caution" | "info";
  label: string;
  rule: string;
  anchor?: string;
  position?: Record<string, number>;
  size?: { width: number; height: number };
  relativeTo?: string;
  note?: string;
  inset?: number;
  borderWidth?: number;
}

export interface ScaffoldSurface {
  id: string;
  label: string;
  zones: ScaffoldZone[];
  llmPrompt: string;
}

export interface ScaffoldDimensions {
  trimWidth: number;
  trimHeight: number;
  fileWidth: number;
  fileHeight: number;
  unit: string;
}

export interface Scaffold {
  slug: string;
  displayName: string;
  format: string;
  size: string;
  plan: string;
  dimensions: ScaffoldDimensions;
  bleedModel: { type: string; bleed?: number; clearSpace?: number; noPrintBorder?: number; description?: string };
  safeZone: { inset: number; measuredFrom: string; safeWidth: number; safeHeight: number } | null;
  surfaces: ScaffoldSurface[];
  acceptedFormats: string[];
  mergeVariables: boolean;
  printSpecs: Record<string, unknown>;
  notes: string[];
  // Optional fields present on some formats
  figma?: { fileKey: string; htmlScaffold: string };
  foldType?: string;
  finishedSize?: { width: number; height: number; unit: string; note?: string };
  foldLines?: Array<{ id: string; orientation: string; position: Record<string, number>; label: string; relativeTo?: string }>;
  panels?: Array<{ id: string; label: string; width: number; height: number; fromLeft?: number; fromTop?: number }>;
  panelOffset?: Record<string, unknown>;
  envelope?: Record<string, unknown>;
  pages?: { min: number; max: number; extraPostageAfter?: number; increment?: number; validCounts?: number[] };
  binding?: Record<string, unknown>;
  orientations?: Array<Record<string, unknown>>;
  perforation?: Record<string, unknown>;
  roundedCorners?: { radius: number; unit?: string };
}

// ---------------------------------------------------------------------------
// Designer-facing types
// ---------------------------------------------------------------------------

export interface LobFormat {
  id: string;
  label: string;
  /** CSS dimensions for the preview iframe */
  width: string;
  height: string;
  /** Surface definitions from the scaffold */
  surfaces: ScaffoldSurface[];
  /** Whether this format supports merge variables */
  mergeVariables: boolean;
  /** The full scaffold data for reference */
  scaffold: Scaffold;
}

export interface BrandConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  fontFamily: string;
  orgName: string;
}

export interface DesignerState {
  templateHtml: Record<string, string>;
  activeSide: string;
  activeFormat: LobFormat;
  mergeVars: Record<string, string>;
  brandConfig: BrandConfig;
}
