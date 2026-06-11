import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";

export default function SpaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      {/* pb leaves room for the fixed bottom nav (h-16 + raised button) */}
      <div className="max-w-md mx-auto px-5 pt-8 pb-28">{children}</div>
      <BottomNav />
    </div>
  );
}