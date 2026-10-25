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
    { href: "/", label: "Home", active: pathname === "/" },
    {
      href: "/request",
      label: "New request",
      active: pathname === "/request" || pathname.startsWith("/request/"),
    },
    {
      href: "/requests",
      label: "My requests",
      active: pathname.startsWith("/requests"),
    },
    ...(managesTeam
      ? [
          {
            href: "/approvals",
            label: pending > 0 ? `Approvals ${pending}` : "Approvals",
            active: pathname.startsWith("/approvals"),
          },
          {
            href: "/team",
            label: "Team history",
            active: pathname.startsWith("/team"),
          },
        ]
      : []),
  ];

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Primary">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition",
            link.active
              ? "bg-primary text-primary-foreground"
              : "text-foreground/80 hover:bg-sand hover:text-foreground",
          )}
          aria-current={link.active ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
