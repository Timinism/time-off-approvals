import { getAppUser } from "@/lib/session";
import { updateComponents } from "@/lib/updater-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST() {
  const user = await getAppUser();
  if (!user) return json({ error: "Sign in to update components." }, 401);
  if (!user.managesTeam) return json({ error: "A manager turns component updates on for this checkout." }, 403);
  try {
    return json(await updateComponents());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time Off could not update components.";
    const status = message === "An update is already running." ? 409 : 502;
    return json({ error: message }, status);
  }
}
