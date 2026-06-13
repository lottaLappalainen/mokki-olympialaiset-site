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

// Left pair: Lajit, Galleria.
const left: NavItem[] = [
  { href: "/o/historia", label: "Lajit", icon: ListChecks },
  { href: "/o/historia/galleria", label: "Galleria", icon: Images },
];

// Right pair: Pelaajat, Asetukset.
const right: NavItem[] = [
  { href: "/o/pelaajat", label: "Pelaajat", icon: User },
  { href: "/o/asetukset", label: "Asetukset", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/o") return pathname === "/o";
  // Galleria is nested under /o/historia, so match it exactly and make sure
  // "Lajit" (/o/historia) doesn't also light up when on the gallery page.
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
        {/* Left pair: Lajit, Galleria */}
        <div className="flex gap-1">
          {left.map((item) => (
            <NavButton
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
            />
          ))}
        </div>

        {/* Center: Tulostaulukko (leaderboard / home), raised */}
        <Link
          href="/o"
          aria-label="Tulostaulukko"
          className={`absolute left-1/2 -translate-x-1/2 -top-5 w-16 h-16 rounded-full flex items-center justify-center border-4 border-paper ${
            homeActive ? "bg-wine text-paper" : "bg-teal-400 text-ink"
          }`}
        >
          <Trophy size={24} />
        </Link>

        {/* Right pair: Pelaajat, Asetukset */}
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