"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { entraConfigured, signIn, signOut } from "@/lib/auth";
import { appSecret, demoAllowed, graphScopes } from "@/lib/config";
import { calendarIntegrationEnabled, setCalendarIntegration } from "@/lib/settings";
import { DEMO_COOKIE, sealValue } from "@/lib/crypto";
import { demoPerson } from "@/lib/demo-people";
import { seedDemo } from "@/lib/demo-seed";
import { getAppUser } from "@/lib/session";
import { cancelTimeOff, decideTimeOff, resendTimeOff, submitTimeOff } from "@/lib/service";
import { errorMessage, safeCallback } from "@/lib/text";

export type ActionState = { error: string } | null;

async function requireUser() {
  const user = await getAppUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function microsoftSignIn(formData: FormData) {
  if (!entraConfigured) {
    redirect(
      `/sign-in?error=${encodeURIComponent("Microsoft Entra ID is not configured yet. The setup page lists what to add.")}`,
    );
  }
  const calendar = calendarIntegrationEnabled();
  await signIn(
    "microsoft-entra-id",
    { redirectTo: safeCallback(String(formData.get("callbackUrl") || "/")) },
    { scope: graphScopes(calendar) },
  );
}

export async function setCalendarAction(formData: FormData) {
  const user = await requireUser();
  const returnTo = safeCallback(String(formData.get("returnTo") || "/"));
  if (!user.managesTeam) redirect(returnTo);
  setCalendarIntegration(formData.get("enabled") === "on");
  redirect(returnTo);
}

export async function enterDemo(formData: FormData) {
  if (!demoAllowed()) {
    redirect(`/sign-in?error=${encodeURIComponent("Demo sign-in is turned off on this server.")}`);
  }
  const userId = String(formData.get("userId") || "");
  if (!demoPerson(userId)) {
    redirect(`/sign-in?error=${encodeURIComponent("That person is not in the sample directory.")}`);
  }
  seedDemo();
  const jar = await cookies();
  jar.set(DEMO_COOKIE, sealValue(userId, appSecret()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(safeCallback(String(formData.get("callbackUrl") || "/")));
}

export async function signOutAction() {
  const user = await getAppUser();
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  if (user?.source === "entra") {
    await signOut({ redirectTo: "/sign-in" });
  }
  redirect("/sign-in");
}

export async function submitRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  let id = "";
  try {
    id = await submitTimeOff(user, {
      type: String(formData.get("type") || ""),
      startDate: String(formData.get("startDate") || ""),
      endDate: String(formData.get("endDate") || ""),
      notes: String(formData.get("notes") || ""),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  redirect(`/requests/${id}`);
}

export async function decideRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("requestId") || "");
  const decision = String(formData.get("decision") || "");
  if (decision !== "approved" && decision !== "denied") {
    return { error: "Choose approve or deny." };
  }
  try {
    await decideTimeOff(user, id, decision, String(formData.get("note") || ""));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  redirect(`/requests/${id}`);
}

export async function approveNow(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("requestId") || "");
  if (!id) {
    redirect(`/approvals?error=${encodeURIComponent("That approval is missing an id.")}`);
  }
  try {
    await decideTimeOff(user, id, "approved", "");
  } catch (error) {
    redirect(`/requests/${id}?error=${encodeURIComponent(errorMessage(error))}`);
  }
  redirect(`/requests/${id}`);
}

export async function cancelRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("requestId") || "");
  try {
    await cancelTimeOff(user, id);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  redirect(`/requests/${id}`);
}

export async function resendNotificationAction(formData: FormData) {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") || "");
  const notificationId = String(formData.get("notificationId") || "");
  try {
    await resendTimeOff(user, notificationId);
  } catch (error) {
    redirect(`/requests/${requestId}?error=${encodeURIComponent(errorMessage(error))}`);
  }
  redirect(`/requests/${requestId}`);
}
