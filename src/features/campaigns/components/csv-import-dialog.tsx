"use client";

import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: Record<string, unknown>[]) => void;
  isSubmitting?: boolean;
}

const expectedHeaders = [
  "email",
  "first_name",
  "last_name",
  "company",
  "title",
  "phone",
  "linkedin_url",
];

export function CsvImportDialog({
  open,
  onClose,
  onImport,
  isSubmitting = false,
}: CsvImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-4xl p-5">
        <DialogHeader className="px-0 pt-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>Import Leads CSV</DialogTitle>
              <DialogDescription className="mt-1">
                Expected headers: {expectedHeaders.join(", ")}
              </DialogDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogHeader>

        <div>
          <button
            type="button"
            className="w-full cursor-pointer rounded-lg border-2 border-dashed border-zinc-700 p-8 text-center text-zinc-300 hover:border-zinc-500"
            onClick={() => inputRef.current?.click()}
          >
            Click to select CSV file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={async (event) => {
              setError("");
              const file = event.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const parsed = parseCsv(text);
              if (parsed.error) {
                setRows([]);
                setError(parsed.error);
                return;
              }
              setRows(parsed.rows);
            }}
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {previewRows.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-zinc-300">Preview (first {previewRows.length} rows)</p>
            <div className="overflow-x-auto rounded-md border border-zinc-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    {expectedHeaders.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, index) => (
                    <TableRow key={`${row.email ?? "row"}-${index}`}>
                      {expectedHeaders.map((header) => (
                        <TableCell key={`${index}-${header}`}>
                          {typeof row[header] === "string" ? String(row[header]) : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            disabled={isSubmitting || rows.length === 0}
            onClick={() => onImport(rows)}
          >
            {isSubmitting ? "Importing..." : "Import Leads"}
          </Button>
          {rows.length > 0 && <p className="text-sm text-zinc-400">{rows.length} rows parsed</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function parseCsv(rawCsv: string): { rows: Record<string, unknown>[]; error?: string } {
  const lines = rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { rows: [], error: "CSV must include headers and at least one data row." };
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  if (!headers.includes("email")) {
    return { rows: [], error: "CSV must include an email column." };
  }

  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { rows };
}
