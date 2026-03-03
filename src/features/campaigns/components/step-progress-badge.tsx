"use client";

import { Badge } from "@/components/ui/badge";

type StepStatus = "pending" | "executing" | "executed" | "skipped" | "failed" | "completed";

export function StepProgressBadge({ status }: { status: StepStatus }) {
  if (status === "pending") {
    return <Badge variant="outline">Pending</Badge>;
  }
  if (status === "executing") {
    return <Badge variant="warning">Executing</Badge>;
  }
  if (status === "executed") {
    return <Badge variant="success">Executed</Badge>;
  }
  if (status === "skipped") {
    return <Badge variant="secondary">Skipped</Badge>;
  }
  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }
  return <Badge className="bg-blue-600/20 text-blue-400">Completed</Badge>;
}
