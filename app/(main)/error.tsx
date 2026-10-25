"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border/80 bg-card p-6 shadow-sm">
      <h1 className="text-3xl font-semibold tracking-tight">Time Off hit a snag</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The page did not finish loading. You can try it again. If it keeps failing, the detail below
        is what the server reported.
      </p>
      <p className="mt-4 rounded-xl bg-sand px-3 py-2 text-sm">{error.message || "Unknown error"}</p>
      <Button type="button" className="mt-4" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
