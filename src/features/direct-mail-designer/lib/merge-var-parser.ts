/** Extract unique merge variable names from {{var_name}} patterns in HTML */
export function parseMergeVars(html: string): string[] {
  const matches = html.matchAll(/\{\{(\w+)\}\}/g);
  const vars = new Set<string>();
  for (const m of matches) {
    vars.add(m[1]);
  }
  return Array.from(vars).sort();
}
