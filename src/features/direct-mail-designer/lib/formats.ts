import type { LobFormat, Scaffold } from "../types";
import { HTML_SCAFFOLDS } from "../scaffolds";

const PREVIEW_DPI = 96;

function scaffoldToFormat(scaffold: Scaffold): LobFormat {
  return {
    id: scaffold.slug,
    label: scaffold.displayName,
    width: `${Math.round(scaffold.dimensions.fileWidth * PREVIEW_DPI)}px`,
    height: `${Math.round(scaffold.dimensions.fileHeight * PREVIEW_DPI)}px`,
    surfaces: scaffold.surfaces,
    mergeVariables: scaffold.mergeVariables,
    scaffold,
  };
}

/** All formats that accept HTML — usable in the designer */
export const LOB_FORMATS: LobFormat[] = HTML_SCAFFOLDS.map(scaffoldToFormat);

export const DEFAULT_FORMAT = LOB_FORMATS[0];

/** Look up a format by slug, falling back to the default */
export function getFormatById(id: string): LobFormat {
  return LOB_FORMATS.find((f) => f.id === id) || DEFAULT_FORMAT;
}
