import { cn } from "@/lib/utils";

type TagColor = "purple" | "blue" | "green" | "coral";

const colorMap: Record<TagColor, string> = {
  purple: "text-purple bg-purple-light",
  blue: "text-blue bg-blue-light",
  green: "text-green bg-green-light",
  coral: "text-coral bg-coral-light",
};

interface SectionTagProps {
  color: TagColor;
  children: React.ReactNode;
}

export function SectionTag({ color, children }: SectionTagProps) {
  return (
    <span className={cn("inline-block text-[9px] font-semibold uppercase tracking-[0.07em] px-2.5 py-0.5 rounded-full mb-2.5", colorMap[color])}>
      {children}
    </span>
  );
}
