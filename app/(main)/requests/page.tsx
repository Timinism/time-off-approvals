import { EmptyState } from "@/components/empty-state";
import { RequestFilters } from "@/components/filters";
import { RequestCard } from "@/components/request-card";
import { listVisibleRequests } from "@/lib/repo";
import { getAppUser } from "@/lib/session";
import { applyFilters, readFilters } from "@/lib/view";
import Link from "next/link";

export const metadata = { title: "My requests" };

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const user = await getAppUser();
  if (!user) return null;
  const filters = readFilters(await searchParams);
  const mine = applyFilters(
    listVisibleRequests(user.id).filter((request) => request.requesterId === user.id),
    filters,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">History</p>
          <h1 className="mt-2 text-4xl tracking-tight">Your requests</h1>
        </div>
        <Link href="/request" className="text-sm font-medium text-primary">
          New request
        </Link>
      </div>
      <RequestFilters base="/requests" status={filters.status} type={filters.type} />
      {mine.length === 0 ? (
        <EmptyState
          title="Nothing in this view"
          body="Requests you submit show up here, including ones that were approved, denied, or cancelled."
        />
      ) : (
        <div className="grid gap-3">
          {mine.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
