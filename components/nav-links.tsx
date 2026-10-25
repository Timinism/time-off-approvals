"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({
  managesTeam,
  pending,
}: {
  managesTeam: boolean;
  pending: number;
}) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home", count: 0, active: pathname === "/" },
    {
      href: "/request",
      label: "New request",
      count: 0,
      active: pathname === "/request" || pathname.startsWith("/request/"),
    },
    {
      href: "/requests",
      label: "My requests",
      count: 0,
      active: pathname.startsWith("/requests"),
    },
    ...(managesTeam
      ? [
          {
            href: "/approvals",
            label: "Approvals",
            count: pending,
            active: pathname.startsWith("/approvals"),
          },
          {
            href: "/team",
            label: "Team",
            count: 0,
            active: pathname.startsWith("/team"),
          },
        ]
      : []),
  ];

  return (
    <nav className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full bg-muted/80 p-1" aria-label="Primary">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition",
            link.active
              ? "bg-card text-foreground shadow-sm ring-1 ring-border/80"
              : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
          )}
          aria-current={link.active ? "page" : undefined}
        >
          {link.label}
          {link.count > 0 ? (
            <span
              className={cn(
                "ml-1.5 grid min-w-5 place-items-center rounded-full px-1 text-[11px] leading-5 font-semibold",
                link.active ? "bg-primary text-primary-foreground" : "bg-primary/12 text-primary",
              )}
            >
              {link.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
