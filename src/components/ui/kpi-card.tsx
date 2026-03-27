import { cn } from "@/lib/utils";

type KPIColor = "blue" | "green" | "coral" | "red" | "purple" | "teal";

const colorMap: Record<KPIColor, string> = {
  blue: "before:bg-blue",
  green: "before:bg-green",
  coral: "before:bg-coral",
  red: "before:bg-red",
  purple: "before:bg-purple",
  teal: "before:bg-teal",
};

interface KPICardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  color: KPIColor;
  className?: string;
}

export function KPICard({ label, value, subtitle, color, className }: KPICardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-card p-3 before:absolute before:left-0 before:top-0 before:h-[2.5px] before:w-full",
        colorMap[color],
        className
      )}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-muted mb-1">
        {label}
      </div>
      <div className="font-mono text-lg font-medium">{value}</div>
      {subtitle && (
        <div className="text-[9px] text-foreground-muted mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}
