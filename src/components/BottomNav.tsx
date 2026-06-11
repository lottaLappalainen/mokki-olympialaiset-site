"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Trophy, History, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const left: NavItem = { href: "/o/loki", label: "Loki", icon: ClipboardList };
const right: NavItem[] = [
  { href: "/o/historia", label: "Historia", icon: History },
  { href: "/o/profiili", label: "Profiili", icon: User },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/o") return pathname === "/o";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center gap-1 px-3 py-1 ${
        active ? "text-primary" : "text-teal-600"
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className="text-xs font-medium">{item.label}</span>
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
      <div className="relative max-w-md mx-auto flex items-center justify-between px-6 h-16">
        <NavButton item={left} active={isActive(pathname, left.href)} />

        {/* Center: leaderboard, raised */}
        <Link
          href="/o"
          aria-label="Pistetilanne"
          className={`absolute left-1/2 -translate-x-1/2 -top-5 w-16 h-16 rounded-full flex flex-col items-center justify-center gap-0.5 border-4 border-paper ${
            homeActive ? "bg-primary text-paper" : "bg-teal-400 text-ink"
          }`}
        >
          <Trophy size={24} />
        </Link>
        <span className="absolute left-1/2 -translate-x-1/2 bottom-1.5 text-xs font-medium text-teal-600">
          Tilanne
        </span>

        <div className="flex">
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