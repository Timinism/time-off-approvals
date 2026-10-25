import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl font-semibold tracking-tight">That request is not available</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        It may have the wrong link, or it belongs to someone outside your team.
      </p>
      <Button className="mt-6" nativeButton={false} render={<Link href="/" />}>
        Back home
      </Button>
    </div>
  );
}
