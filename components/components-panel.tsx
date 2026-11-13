"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

type Row = {
  name: string;
  vendor: string;
  section: "runtime" | "build";
  installed: string | null;
  supported: string;
  latest: string;
  status: "current" | "behind" | "ahead" | "missing" | "held";
  note: string;
};

type Report = {
  checkedAt: string;
  node: string;
  apply: { enabled: boolean; reason: string };
  warning: string | null;
  components: Row[];
};

const STATUS = {
  current: { label: "Current", className: "text-lagoon" },
  behind: { label: "Behind", className: "text-primary" },
  ahead: { label: "Ahead", className: "text-muted-foreground" },
  missing: { label: "Missing", className: "text-destructive" },
  held: { label: "Held", className: "text-muted-foreground" },
} as const;

class PanelError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function loadReport(url: string, init?: RequestInit): Promise<Report> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const text = await response.text();
  let data: (Report & { error?: string }) | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as Report & { error?: string };
    } catch {
      throw new PanelError(response.status, "Time Off returned an unexpected response.");
    }
  }
  if (!response.ok) {
    throw new PanelError(response.status, data?.error || "Request failed.");
  }
  if (!data) throw new PanelError(response.status, "Time Off returned an empty response.");
  return data;
}

function checkedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function ComponentsPanel({ canUpdate }: { canUpdate: boolean }) {
  const [view, setView] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"check" | "update" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const pull = useCallback(async (url: string) => {
    const next = await loadReport(url);
    setView(next);
    setFormError(null);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadReport("/api/components").then(
      (next) => {
        if (cancelled) return;
        setView(next);
        setLoading(false);
      },
      (caught: unknown) => {
        if (cancelled) return;
        setFormError(caught instanceof Error ? caught.message : "Could not check the registries.");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const behind = view?.components.filter((row) => row.status === "behind" || row.status === "missing").length ?? 0;
  const held = view?.components.filter((row) => row.status === "held").length ?? 0;
  const apply = Boolean(view?.apply.enabled && canUpdate);

  async function check() {
    setBusy("check");
    setFormError(null);
    setNotice(null);
    try {
      await pull("/api/components?refresh=1");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not check the registries.");
    } finally {
      setBusy(null);
    }
  }

  async function update() {
    setConfirming(false);
    setBusy("update");
    setFormError(null);
    setNotice(null);
    try {
      const next = await loadReport("/api/components/update", { method: "POST" });
      setView(next);
      const remaining = next.components.filter((row) => row.status === "behind" || row.status === "missing").length;
      setNotice(
        remaining === 0
          ? "Every component is on the latest supported release."
          : "Time Off installed the supported releases it could. Check the rows that are still behind.",
      );
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not update components.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Components"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void check()} disabled={busy !== null}>
              {busy === "check" ? "Checking…" : "Check again"}
            </Button>
            {apply ? (
              <Button onClick={() => setConfirming(true)} disabled={busy !== null || behind === 0}>
                {busy === "update" ? "Updating…" : "Update all"}
              </Button>
            ) : null}
          </div>
        }
      >
        Next.js, React, and the rest of this build. Time Off asks npm for each vendor’s latest stable
        release, then keeps the newest version the rest of this set still supports. Next.js and its
        ESLint config stay on a release both packages publish.
      </PageHeader>

      {formError ? (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {view?.warning ? <p className="text-sm text-primary">{view.warning}</p> : null}
      {notice ? (
        <p className="rounded-xl border border-lagoon/40 bg-lagoon/10 px-4 py-3 text-sm">{notice}</p>
      ) : null}
      {view && !apply ? (
        <p className="glass rounded-xl border border-border/80 px-4 py-3 text-sm text-muted-foreground">
          {canUpdate ? view.apply.reason : "You can review the versions. A manager installs updates into this checkout."}
        </p>
      ) : null}
      {loading && !view ? <p className="text-sm text-muted-foreground">Asking the registries…</p> : null}
      {view ? (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
            <span>
              {behind === 0 && held === 0
                ? "All on the latest supported release"
                : [behind > 0 ? `${behind} behind` : null, held > 0 ? `${held} held` : null].filter(Boolean).join(" · ")}
            </span>
            <span>Node {view.node}</span>
            <span>Checked {checkedLabel(view.checkedAt)}</span>
          </div>
          <ul className="glass divide-y divide-border/80 overflow-hidden rounded-2xl border border-border/80">
            {view.components.map((row) => (
              <li
                key={row.name}
                className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_7rem_7rem_7rem_5rem] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.vendor} · {row.section === "runtime" ? "Runtime" : "Build"}
                  </p>
                  {row.supported !== row.latest || row.status !== "current" ? (
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{row.note}</p>
                  ) : null}
                </div>
                <Version label="Installed" value={row.installed ?? "—"} />
                <Version label="Supported" value={row.supported} />
                <Version label="Vendor latest" value={row.latest} />
                <p className={`font-mono text-xs tracking-wide uppercase md:text-right ${STATUS[row.status].className}`}>
                  {STATUS[row.status].label}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {confirming ? (
        <div className="glass rounded-2xl border border-border/80 p-5">
          <h2 className="text-lg font-semibold">Update every component</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Time Off will install the latest supported release of each library in this checkout. The
            dev server may reload when Next.js or React changes.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={() => void update()} disabled={busy !== null}>
              Install updates
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Version({ label, value }: { label: string; value: string }) {
  return (
    <p className="font-mono text-xs">
      <span className="mr-2 text-muted-foreground md:hidden">{label}</span>
      <span className="hidden text-muted-foreground md:mb-1 md:block">{label}</span>
      {value}
    </p>
  );
}
