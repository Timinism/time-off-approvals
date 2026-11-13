import { ComponentsPanel } from "@/components/components-panel";
import { getAppUser } from "@/lib/session";

export const metadata = { title: "Components" };

export default async function ComponentsPage() {
  const user = await getAppUser();
  if (!user) return null;
  return <ComponentsPanel canUpdate={user.managesTeam} />;
}
