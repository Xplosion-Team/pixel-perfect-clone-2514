import { cn } from "@/lib/utils";

type InfoVariant = "warning" | "success" | "info" | "note" | "question" | "emphasis";

const variantStyles: Record<InfoVariant, { box: string; heading: string }> = {
  warning: { box: "bg-red-light border-red-muted", heading: "text-red" },
  success: { box: "bg-green-light border-green-muted", heading: "text-green" },
  info: { box: "bg-amber-light border-amber-muted", heading: "text-amber" },
  note: { box: "bg-blue-light border-border", heading: "text-blue" },
  question: { box: "bg-purple-light border-purple-muted", heading: "text-purple" },
  emphasis: { box: "bg-teal-light border-teal-muted", heading: "text-teal" },
};

interface InfoBoxProps {
  variant: InfoVariant;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function InfoBox({ variant, title, children, className }: InfoBoxProps) {
  const styles = variantStyles[variant];
  return (
    <div className={cn("rounded-lg border-[0.5px] p-3.5 text-[11px] leading-relaxed mb-2", styles.box, className)}>
      <h3 className={cn("text-[11px] font-semibold mb-1", styles.heading)}>{title}</h3>
      <div className="text-foreground-secondary">{children}</div>
    </div>
  );
}
