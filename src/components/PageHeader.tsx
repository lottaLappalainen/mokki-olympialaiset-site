import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export default function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-teal-600 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}