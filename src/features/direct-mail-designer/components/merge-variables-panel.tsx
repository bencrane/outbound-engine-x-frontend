"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MergeVariablesPanelProps {
  vars: string[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

export function MergeVariablesPanel({ vars, values, onChange }: MergeVariablesPanelProps) {
  if (vars.length === 0) {
    return (
      <div className="border-t border-zinc-800 px-4 py-3 text-sm text-zinc-500">
        No merge variables detected. Use {"{{variable_name}}"} syntax in your template.
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-800 px-4 py-3">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
        Merge Variables
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {vars.map((v) => (
          <div key={v}>
            <Label className="text-xs text-zinc-500">{`{{${v}}}`}</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              placeholder={`Preview value for ${v}`}
              value={values[v] || ""}
              onChange={(e) => onChange({ ...values, [v]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
