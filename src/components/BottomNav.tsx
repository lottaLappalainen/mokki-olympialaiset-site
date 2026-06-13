"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, ListChecks, Images, User, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Left pair: Asetukset, Galleria.
const left: NavItem[] = [
  { href: "/o/asetukset", label: "Asetukset", icon: Settings },
  { href: "/o/historia/galleria", label: "Galleria", icon: Images },
];

// Right pair: Pelaajat, Lajit.
const right: NavItem[] = [
  { href: "/o/historia", label: "Lajit", icon: ListChecks },
  { href: "/o/pelaajat", label: "Pelaajat", icon: User },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/o") return pathname === "/o";
  // "Lajit" (/o/historia) must NOT light up while on the gallery page.
  if (href === "/o/historia") {
    return (
      pathname === "/o/historia" ||
      (pathname.startsWith("/o/historia/") &&
        !pathname.startsWith("/o/historia/galleria"))
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center gap-1 px-2 py-1 ${
        active ? "text-wine" : "text-ink"
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[11px] font-medium">{item.label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const homeActive = isActive(pathname, "/o");

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-paper border-t border-mint-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative max-w-md mx-auto flex items-center justify-between px-3 h-16">
        {/* Left pair: Asetukset, Galleria */}
        <div className="flex gap-1">
          {left.map((item) => (
            <NavButton
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
            />
          ))}
        </div>

        {/* Center: Pisteet (leaderboard / home), raised */}
        <Link
          href="/o"
          aria-label="Pisteet"
          className={`absolute left-1/2 -translate-x-1/2 -top-5 w-16 h-16 rounded-full flex items-center justify-center border-4 border-paper ${
            homeActive ? "bg-wine text-paper" : "bg-teal-400 text-ink"
          }`}
        >
          <Trophy size={24} />
        </Link>

        {/* Right pair: Pelaajat, Lajit */}
        <div className="flex gap-1">
          {right.map((item) => (
            <NavButton
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}