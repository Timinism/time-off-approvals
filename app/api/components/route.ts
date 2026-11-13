import { getAppUser } from "@/lib/session";
import { componentReport } from "@/lib/updater-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function GET(request: Request) {
  const user = await getAppUser();
  if (!user) return json({ error: "Sign in to check component versions." }, 401);
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  try {
    return json(await componentReport(refresh));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time Off could not read component versions.";
    return json({ error: message }, 502);
  }
}
