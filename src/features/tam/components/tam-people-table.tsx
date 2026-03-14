"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TAMPerson } from "@/features/tam/api";
import { formatRelativeTime } from "@/lib/format";
import { TableSkeleton } from "@/features/tam/components/tam-companies-table";

interface TAMPeopleTableProps {
  people: TAMPerson[];
  isLoading: boolean;
  error: Error | null;
}

export function TAMPeopleTable({
  people,
  isLoading,
  error,
}: TAMPeopleTableProps) {
  if (error) {
    return (
      <div className="rounded-md bg-red-500/10 p-4 border border-red-500/20">
        <p className="text-sm text-red-400 font-medium">Failed to load people</p>
        <p className="mt-1 text-xs text-red-400/80 font-mono break-all">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return <TableSkeleton cols={5} />;
  }

  if (people.length === 0) {
    return <p className="text-sm text-zinc-400">No people found</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => (
            <TableRow key={person.entity_id}>
              <TableCell className="font-medium text-white">
                {person.full_name ?? "-"}
              </TableCell>
              <TableCell className="text-zinc-400">{person.work_email ?? "-"}</TableCell>
              <TableCell className="text-zinc-400">{person.title ?? "-"}</TableCell>
              <TableCell className="text-zinc-400">
                {person.department ?? "-"}
              </TableCell>
              <TableCell className="text-zinc-400">
                {formatRelativeTime(person.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
