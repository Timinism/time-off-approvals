"use client";

import { useState } from "react";
import { useActionState } from "react";
import { HeartPulse, TreePalm } from "lucide-react";
import { submitRequestAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { spanSummary } from "@/lib/dates";
import { typeLong } from "@/lib/text";
import type { BlockedRange, LeaveType } from "@/lib/types";
import { findBlockedOverlap, validateDraft } from "@/lib/validate";
import { cn } from "@/lib/utils";

export function RequestForm({
  defaultType,
  today,
  sickEarliest,
  latest,
  managerName,
  managerEmail,
  itopsEmail,
  blocked,
}: {
  defaultType: LeaveType;
  today: string;
  sickEarliest: string;
  latest: string;
  managerName: string | null;
  managerEmail: string | null;
  itopsEmail: string;
  blocked: BlockedRange[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitRequestAction, null);
  const [type, setType] = useState<LeaveType>(defaultType);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const parsed =
    startDate && endDate
      ? validateDraft({ type, startDate, endDate, notes: "" }, today)
      : null;
  const overlap =
    parsed?.ok ? findBlockedOverlap(parsed.value, blocked) : null;
  const summary = parsed?.ok
    ? spanSummary(parsed.value.startDate, parsed.value.endDate)
    : parsed?.error;

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium">Type</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["pto", "sick"] as const).map((option) => (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition",
                type === option ? "border-primary ring-3 ring-primary/15" : "border-border/80 hover:border-primary/30",
              )}
            >
              <input
                type="radio"
                name="type"
                value={option}
                checked={type === option}
                onChange={() => setType(option)}
                className="sr-only"
              />
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-lg",
                  option === "pto" ? "bg-clay/12 text-clay" : "bg-lagoon/12 text-lagoon",
                )}
              >
                {option === "pto" ? <TreePalm className="size-5" aria-hidden /> : <HeartPulse className="size-5" aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{typeLong(option)}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {option === "pto"
                    ? "Vacation, personal days, and planned time away."
                    : "Illness, injury, or a medical appointment."}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">First day out</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            min={type === "sick" ? sickEarliest : today}
            max={latest}
            value={startDate}
            onValueChange={(value) => {
              setStartDate(value);
              if (!endDate || endDate < value) setEndDate(value);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Last day out</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            min={startDate || (type === "sick" ? sickEarliest : today)}
            max={latest}
            value={endDate}
            onValueChange={setEndDate}
          />
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl px-4 py-3 text-sm",
          overlap || (parsed && !parsed.ok)
            ? "bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100"
            : "bg-sand text-foreground",
        )}
        aria-live="polite"
      >
        {startDate && endDate ? summary : "Choose the first and last day you'll be out."}
        {overlap ? (
          <span className="mt-1 block">
            That overlaps a {overlap.status} request already on the books.
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Note for your manager</Label>
        <Textarea
          id="notes"
          name="notes"
          maxLength={2000}
          placeholder={
            type === "sick"
              ? "What should your manager know? This stays off the IT Ops invite."
              : "Optional context, like travel or coverage."
          }
          className="min-h-28 bg-card"
        />
        <p className="text-xs text-muted-foreground">
          Your manager sees this note. The calendar invite to {itopsEmail} does not.
        </p>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        {managerName && managerEmail ? (
          <p className="text-sm">
            <span className="font-medium">{managerName}</span> will get the request, because{" "}
            {managerName} is your manager in Microsoft Entra.
          </p>
        ) : (
          <p className="text-sm text-rose-900 dark:text-rose-200">
            No manager is set on your Entra profile, so this request has nowhere to go. Ask IT to set
            your manager, then sign in again.
          </p>
        )}
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:bg-rose-950/40 dark:text-rose-100">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || !managerEmail || Boolean(overlap) || Boolean(parsed && !parsed.ok)}>
        {pending ? "Sending request…" : `Submit ${typeLong(type).toLowerCase()}`}
      </Button>
    </form>
  );
}
