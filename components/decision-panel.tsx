"use client";

import { useActionState } from "react";
import { cancelRequestAction, decideRequestAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { firstName } from "@/lib/text";

export function DecisionPanel({
  requestId,
  requesterName,
  itopsEmail,
}: {
  requestId: string;
  requesterName: string;
  itopsEmail: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(decideRequestAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="space-y-2">
        <Label htmlFor="decision-note">Note</Label>
        <Textarea
          id="decision-note"
          name="note"
          maxLength={2000}
          placeholder={`Optional if you approve. Required if you deny. ${firstName(requesterName)} will see it.`}
          className="min-h-24 bg-background"
        />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" name="decision" value="approved" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Approve and notify IT Ops"}
      </Button>
      <Button
        type="submit"
        name="decision"
        value="denied"
        variant="outline"
        disabled={pending}
        className="w-full"
      >
        Deny request
      </Button>
      <p className="text-xs text-muted-foreground">
        Approval emails {requesterName} and sends {itopsEmail} an all-day calendar invite covering
        these dates. The invite leaves out the note.
      </p>
    </form>
  );
}

export function CancelRequest({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(cancelRequestAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Cancelling…" : "Cancel this request"}
      </Button>
      <p className="text-xs text-muted-foreground">Your manager gets a short note that you pulled it.</p>
    </form>
  );
}
