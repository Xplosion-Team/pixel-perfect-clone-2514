import { formatCurrency, type BudgetSection } from "@/lib/budget-data";

interface BudgetRangeRowProps {
  item: { label: string; lo: number; hi: number };
  max: number;
  colorClass: string;
}

function BudgetRangeRow({ item, max, colorClass }: BudgetRangeRowProps) {
  const fixed = item.lo === item.hi;
  const lp = (item.lo / max) * 100;
  const hp = (item.hi / max) * 100;

  return (
    <div className="grid grid-cols-[1fr_80px_80px_1fr] items-center py-1.5 border-b border-border last:border-b-0">
      <div className="text-[11px]">{item.label}</div>
      <div className="font-mono text-[10px] text-right pr-2 text-foreground-secondary">
        {formatCurrency(item.lo)}
      </div>
      <div className="font-mono text-[10px] text-right pr-2 font-medium">
        {formatCurrency(item.hi)}
      </div>
      <div className="relative h-3.5">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-background-muted rounded-sm" />
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-1 rounded-sm border opacity-20 bg-${colorClass}`}
          style={{
            left: `${fixed ? 0 : lp}%`,
            width: `${Math.max(fixed ? lp : hp - lp, 1.5)}%`,
          }}
        />
        {fixed ? (
          <div
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-${colorClass}`}
            style={{ left: `${hp}%` }}
          />
        ) : (
          <>
            <div
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full border-[1.5px] border-${colorClass} bg-background`}
              style={{ left: `${lp}%` }}
            />
            <div
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-${colorClass}`}
              style={{ left: `${hp}%` }}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface BudgetSectionDisplayProps {
  section: BudgetSection;
  colorClass: string;
}

export function BudgetSectionDisplay({ section, colorClass }: BudgetSectionDisplayProps) {
  const totalLo = section.items.reduce((a, i) => a + i.lo, 0);
  const totalHi = section.items.reduce((a, i) => a + i.hi, 0);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-sm bg-${colorClass}`} />
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground-secondary">
          {section.title}
        </div>
      </div>
      {section.items.map((item) => (
        <BudgetRangeRow key={item.label} item={item} max={section.max} colorClass={colorClass} />
      ))}
      <div className="grid grid-cols-[1fr_80px_80px_1fr] items-center p-2 mt-1 rounded-md bg-card">
        <div className="text-[11px] font-semibold">Subtotal</div>
        <div className="font-mono text-[10px] text-right pr-2 font-medium text-foreground-secondary">
          {formatCurrency(totalLo)}
        </div>
        <div className={`font-mono text-[10px] text-right pr-2 font-semibold text-${colorClass}`}>
          {formatCurrency(totalHi)}
        </div>
        <div />
      </div>
    </div>
  );
}
