"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, House, Inbox, Users, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavLinks({
  managesTeam,
  pending,
  layout = "bar",
}: {
  managesTeam: boolean;
  pending: number;
  layout?: "bar" | "rail";
}) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home", icon: House, count: 0, active: pathname === "/" },
    {
      href: "/request",
      label: "New request",
      icon: CalendarPlus,
      count: 0,
      active: pathname === "/request" || pathname.startsWith("/request/"),
    },
    {
      href: "/requests",
      label: "My requests",
      icon: Inbox,
      count: 0,
      active: pathname.startsWith("/requests"),
    },
    ...(managesTeam
      ? [
          {
            href: "/approvals",
            label: "Approvals",
            icon: CheckCheck,
            count: pending,
            active: pathname.startsWith("/approvals"),
          },
          {
            href: "/team",
            label: "Team",
            icon: Users,
            count: 0,
            active: pathname.startsWith("/team"),
          },
        ]
      : []),
  ];

  return (
    <nav
      className={cn(
        layout === "rail"
          ? "flex flex-col gap-1"
          : "flex flex-wrap gap-1",
      )}
      aria-label="Primary"
    >
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition",
              link.active
                ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary),transparent_70%)]"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
            aria-current={link.active ? "page" : undefined}
          >
            <Icon className={cn("size-4 shrink-0", link.active ? "text-primary" : "")} aria-hidden />
            {link.label}
            {link.count > 0 ? (
              <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-primary-foreground">
                {link.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
