import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { getAppUser } from "@/lib/session";
import { calendarIntegrationEnabled } from "@/lib/settings";
import { safeCallback } from "@/lib/text";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getAppUser();
  if (!user) {
    const path = (await headers()).get("x-pathname") || "/";
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(safeCallback(path))}`);
  }
  return (
    <Shell user={user} calendarEnabled={calendarIntegrationEnabled()}>
      {children}
    </Shell>
  );
}
