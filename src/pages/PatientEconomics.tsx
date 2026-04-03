import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useCACLTVAssumptions } from "@/hooks/use-cac-ltv-assumptions";
import { BURDEN } from "@/lib/budget-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AVAIL = 160;

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}
function fmt2(n: number) {
  return "$" + n.toFixed(2);
}

function barColor(p: number) {
  if (p < 0.7) return "hsl(var(--green))";
  if (p < 0.9) return "hsl(var(--amber))";
  return "hsl(var(--destructive))";
}

function badgeInfo(p: number): [string, string] {
  if (p < 0.7) return ["OK", "bg-green-light text-green-dark"];
  if (p < 1.0) return ["Near limit", "bg-amber-light text-amber-dark"];
  return ["Overloaded", "bg-red-50 text-destructive"];
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, format, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3 mb-3 last:mb-0">
      <span className="text-xs text-foreground-muted w-[72px] shrink-0">{label}</span>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <span className="font-mono text-xs font-medium text-foreground w-[64px] text-right shrink-0">
        {format(value)}
      </span>
    </div>
  );
}

export default function PatientEconomics() {
  const { assumptions: a, updateAssumption, loaded } = useCACLTVAssumptions();

  const patients = a.patients;
  const rdRate = a.rdRate, rnRate = a.rnRate, maRate = a.maRate;
  const haRate = a.haRate, rcRate = a.rcRate;
  const rdHrs = a.rdHrs, rnHrs = a.rnHrs, maHrs = a.maHrs;
  const billingPct = a.billingPct, revPt = a.revPt;

  const calc = useMemo(() => {
    const rdBase = rdRate * rdHrs;
    const rnBase = rnRate * rnHrs;
    const maBase = maRate * maHrs;
    const rdLoaded = rdBase * BURDEN;
    const rnLoaded = rnBase * BURDEN;
    const maLoaded = maBase * BURDEN;
    const billCost = revPt * (billingPct / 100);
    const totalVar = rdLoaded + rnLoaded + maLoaded + haRate + rcRate + billCost;

    const totalRev = revPt * patients;
    const totalCost = totalVar * patients;
    const profit = totalRev - totalCost;
    const margin = totalRev > 0 ? profit / totalRev : 0;

    const rows = [
      { label: "Dietitian (RD)", sub: `${fmt2(rdBase)} base × 1.15 burden`, perPt: rdLoaded, total: rdLoaded * patients },
      { label: "Nurse (RN)", sub: `${fmt2(rnBase)} base × 1.15 burden`, perPt: rnLoaded, total: rnLoaded * patients },
      { label: "Medical assistant (MA)", sub: `${fmt2(maBase)} base × 1.15 burden`, perPt: maLoaded, total: maLoaded * patients },
      { label: "HealthArc (RPM + CCM platform)", sub: `Flat $${haRate}/pt — device + monitoring bundled`, perPt: haRate, total: haRate * patients },
      { label: "RingCentral (communication)", sub: `Flat $${rcRate}/pt — telehealth & messaging`, perPt: rcRate, total: rcRate * patients },
      { label: "Billing & coding", sub: `${billingPct.toFixed(1)}% of ${fmt2(revPt)} revenue`, perPt: billCost, total: billCost * patients },
      { label: "Total variable cost", sub: "", perPt: totalVar, total: totalCost, bold: true },
    ];

    const roles = [
      { id: "rd", hrs: rdHrs, label: "Dietitian (RD)" },
      { id: "rn", hrs: rnHrs, label: "Nurse (RN)" },
      { id: "ma", hrs: maHrs, label: "Medical assistant (MA)" },
    ];

    const capacity = roles.map((r) => {
      const used = r.hrs * patients;
      const maxP = Math.floor(AVAIL / r.hrs);
      const pct = used / AVAIL;
      const [badge, badgeCls] = badgeInfo(pct);
      return { ...r, used, maxP, pct, badge, badgeCls };
    });

    const minMax = Math.min(...capacity.map((c) => c.maxP));
    const bottleneckRole = capacity.find((c) => c.maxP === minMax)!;
    const allOk = patients <= Math.min(...capacity.map((c) => c.maxP));

    return { totalRev, totalCost, totalVar, profit, margin, rows, capacity, minMax, bottleneckRole, allOk };
  }, [patients, rdRate, rnRate, maRate, haRate, rcRate, rdHrs, rnHrs, maHrs, billingPct, revPt]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-border pb-6" data-tour="econ-header">
        <p className="font-mono text-[11px] tracking-widest uppercase text-foreground-muted mb-2">
          FareRX · MSO Financial Model
        </p>
        <h1 className="text-2xl md:text-[34px] font-semibold text-foreground leading-tight mb-3">
          Patient Economics Calculator
        </h1>
        <p className="text-sm text-foreground-muted max-w-xl leading-relaxed">
          CCM + RPM · HealthArc ${haRate}/pt · RingCentral ${rcRate}/pt · 2026 Medicare rates. All assumptions sync across pages.
        </p>
      </div>

      {/* Explainer */}
      <div className="bg-green-light border-l-[3px] border-green rounded-r-lg p-4 mb-8" data-tour="econ-explainer">
        <p className="text-[13px] font-medium text-green-dark mb-1">How to read this — lemonade stand version</p>
        <p className="text-[13px] text-green-dark/80 leading-relaxed">
          Think of each patient as a customer who pays you ${revPt}/month. You pay workers to serve them —
          a dietitian, a nurse, a medical assistant, plus HealthArc and RingCentral platforms. Whatever is left after paying your workers is your profit.
          The goal: add more customers using the same crew for as long as possible before needing to hire.
        </p>
      </div>

      {/* Patient slider */}
      <p className="font-mono text-[10px] tracking-widest uppercase text-foreground-muted mb-3">Panel size</p>
      <Card className="mb-8" data-tour="econ-patients">
        <CardContent className="flex flex-wrap items-center gap-5 p-5">
          <div className="flex-1 min-w-[140px]">
            <p className="text-sm font-medium text-foreground">Active patients</p>
            <p className="text-xs text-foreground-muted">Slide to model different panel sizes</p>
          </div>
          <Slider
            value={[patients]}
            min={10}
            max={300}
            step={5}
            onValueChange={([v]) => updateAssumption("patients", v)}
            className="flex-[2] min-w-[160px]"
          />
          <span className="font-mono text-3xl font-medium text-foreground min-w-[60px] text-right">{patients}</span>
        </CardContent>
      </Card>

      {/* Metric cards */}
      <p className="font-mono text-[10px] tracking-widest uppercase text-foreground-muted mb-3">Monthly summary</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-10" data-tour="econ-metrics">
        <div className="bg-muted rounded-lg p-4">
          <p className="text-[11px] text-foreground-muted mb-1">Revenue</p>
          <p className="font-mono text-xl font-medium text-foreground">{fmt(calc.totalRev)}</p>
          <p className="text-[11px] text-foreground-muted mt-1">{fmt2(revPt)} × {patients} pts</p>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-[11px] text-foreground-muted mb-1">Variable cost</p>
          <p className="font-mono text-xl font-medium text-foreground">{fmt(calc.totalCost)}</p>
          <p className="text-[11px] text-foreground-muted mt-1">{fmt2(calc.totalVar)} × {patients} pts</p>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-[11px] text-foreground-muted mb-1">Gross profit</p>
          <p className={`font-mono text-xl font-medium ${calc.profit >= 0 ? "text-green" : "text-destructive"}`}>
            {fmt(calc.profit)}
          </p>
          <p className="text-[11px] text-foreground-muted mt-1">before fixed costs</p>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-[11px] text-foreground-muted mb-1">Gross margin</p>
          <p className={`font-mono text-xl font-medium ${calc.margin >= 0.25 ? "text-green" : calc.margin >= 0.1 ? "text-foreground" : "text-destructive"}`}>
            {(calc.margin * 100).toFixed(1)}%
          </p>
          <p className="text-[11px] text-foreground-muted mt-1">target ≥ 25%</p>
        </div>
      </div>

      {/* Staff assumptions */}
      <div className="mb-5">
        <h2 className="text-lg font-medium text-foreground mb-1">Staff & platform assumptions</h2>
        <p className="text-[13px] text-foreground-muted leading-relaxed">
          15% burden on labor. HealthArc and RingCentral are flat platform rates — no burden applied. Changes sync to all pages.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" data-tour="econ-controls">
        <Card>
          <CardContent className="p-5">
            <p className="text-[13px] font-medium text-foreground pb-3 border-b border-border mb-4">
              Hourly rates <span className="text-foreground-muted font-normal ml-2 text-xs">per hour of work</span>
            </p>
            <SliderRow label="RD rate" value={rdRate} min={25} max={70} step={1} format={(v) => `$${v}/hr`} onChange={(v) => updateAssumption("rdRate", v)} />
            <SliderRow label="RN rate" value={rnRate} min={30} max={80} step={1} format={(v) => `$${v}/hr`} onChange={(v) => updateAssumption("rnRate", v)} />
            <SliderRow label="MA rate" value={maRate} min={15} max={40} step={1} format={(v) => `$${v}/hr`} onChange={(v) => updateAssumption("maRate", v)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-[13px] font-medium text-foreground pb-3 border-b border-border mb-4">
              Time per patient / month <span className="text-foreground-muted font-normal ml-2 text-xs">CCM min = 20 min</span>
            </p>
            <SliderRow label="RD time" value={rdHrs} min={0.1} max={2} step={0.05} format={(v) => `${v.toFixed(2)} hr`} onChange={(v) => updateAssumption("rdHrs", v)} />
            <SliderRow label="RN time" value={rnHrs} min={0.1} max={2} step={0.05} format={(v) => `${v.toFixed(2)} hr`} onChange={(v) => updateAssumption("rnHrs", v)} />
            <SliderRow label="MA time" value={maHrs} min={0.1} max={2} step={0.05} format={(v) => `${v.toFixed(2)} hr`} onChange={(v) => updateAssumption("maHrs", v)} />
            <SliderRow label="Billing %" value={billingPct} min={2} max={8} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={(v) => updateAssumption("billingPct", v)} />
          </CardContent>
        </Card>
      </div>

      {/* Platform costs */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <p className="text-[13px] font-medium text-foreground pb-3 border-b border-border mb-4">
            Platform costs <span className="text-foreground-muted font-normal ml-2 text-xs">flat rate per patient — no burden</span>
          </p>
          <SliderRow label="HealthArc" value={haRate} min={5} max={30} step={1} format={(v) => `$${v}/pt`} onChange={(v) => updateAssumption("haRate", v)} />
          <SliderRow label="RingCentral" value={rcRate} min={2} max={15} step={1} format={(v) => `$${v}/pt`} onChange={(v) => updateAssumption("rcRate", v)} />
        </CardContent>
      </Card>

      {/* Revenue per patient */}
      <Card className="mb-10">
        <CardContent className="flex flex-wrap items-center gap-5 p-5">
          <div className="min-w-[180px]">
            <p className="text-[13px] font-medium text-foreground">Revenue per patient / month</p>
            <p className="text-xs text-foreground-muted">Stacked CCM + RPM. 2026 rates ~10% higher.</p>
          </div>
          <Slider
            value={[revPt]}
            min={100}
            max={250}
            step={1}
            onValueChange={([v]) => updateAssumption("revPt", v)}
            className="flex-1 min-w-[120px]"
          />
          <span className="font-mono text-xl font-medium text-green min-w-[80px] text-right">${revPt}</span>
        </CardContent>
      </Card>

      {/* Formula */}
      <p className="font-mono text-[10px] tracking-widest uppercase text-foreground-muted mb-3">How each line is calculated</p>
      <div className="flex flex-wrap items-center gap-3 bg-muted border border-border rounded-lg p-3 mb-10">
        {["rate × hours", "× 1.15 burden", "= loaded cost / pt", "· HealthArc + RC: flat rate", "· billing: % × revenue"].map((chip, i) => (
          <span key={i} className={i === 0 || i === 1 || i === 2 ? "font-mono text-xs bg-background border border-border rounded-md px-2.5 py-1 text-foreground-secondary" : "text-[13px] text-foreground-muted"}>
            {chip}
          </span>
        ))}
      </div>

      {/* Cost table */}
      <div className="mb-5">
        <h2 className="text-lg font-medium text-foreground mb-1">Cost breakdown per patient</h2>
        <p className="text-[13px] text-foreground-muted leading-relaxed">
          Every row updates with your slider values. The total variable cost per patient drives your gross margin.
        </p>
      </div>

      <Card className="mb-10 overflow-hidden" data-tour="econ-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="font-mono text-[10px] tracking-wider uppercase text-foreground-muted">Role / line item</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider uppercase text-foreground-muted text-right">Per patient</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider uppercase text-foreground-muted text-right">× panel</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider uppercase text-foreground-muted text-right">Monthly total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calc.rows.map((row) => (
              <TableRow key={row.label} className={row.bold ? "bg-muted font-medium" : ""}>
                <TableCell>
                  <div className={`text-[13px] ${row.bold ? "font-medium text-foreground" : "text-foreground"}`}>{row.label}</div>
                  {row.sub && <div className="text-[11px] text-foreground-muted mt-0.5">{row.sub}</div>}
                </TableCell>
                <TableCell className="font-mono text-[13px] text-right">{fmt2(row.perPt)}</TableCell>
                <TableCell className="font-mono text-[13px] text-right text-foreground-muted">× {patients}</TableCell>
                <TableCell className="font-mono text-[13px] text-right font-medium">{fmt(row.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Crew capacity */}
      <div className="mb-5">
        <h2 className="text-lg font-medium text-foreground mb-1">Crew capacity — can one crew handle your panel?</h2>
        <p className="text-[13px] text-foreground-muted leading-relaxed">
          Each staff member has roughly 160 available hours per month. The bar shows how much of that budget your panel consumes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8" data-tour="econ-capacity">
        {calc.capacity.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-5">
              <p className="text-xs text-foreground-muted mb-2.5">{c.label}</p>
              <div className="h-[5px] bg-muted rounded-full overflow-hidden mb-2.5">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(c.pct, 1) * 100}%`, backgroundColor: barColor(c.pct) }}
                />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="font-mono text-[13px] font-medium text-foreground">{c.used.toFixed(0)} hrs used</p>
                  <p className="text-[11px] text-foreground-muted mt-0.5">max solo panel: {c.maxP} pts</p>
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${c.badgeCls}`}>
                  {c.badge}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottleneck callout */}
      <div className="bg-green-light border-l-[3px] border-green rounded-r-lg p-4 mb-10">
        <p className="text-[13px] font-medium text-green-dark mb-1">
          {calc.allOk
            ? `One crew can handle ${patients} patients comfortably`
            : `Heads up — ${calc.bottleneckRole.label} is at capacity`}
        </p>
        <p className="text-[13px] text-green-dark/80 leading-relaxed">
          {calc.allOk
            ? `Your bottleneck is ${calc.bottleneckRole.label} at ${calc.minMax} patients. Nobody is close to their hourly ceiling. Scale up before adding staff.`
            : `At ${patients} patients your ${calc.bottleneckRole.label} is over their 160-hour limit. Consider adding a part-time resource before the panel grows further.`}
        </p>
      </div>

      {/* Footnote */}
      <div className="text-xs text-foreground-muted leading-relaxed border-t border-border pt-6">
        <strong className="text-foreground-secondary font-medium">Assumptions:</strong> 160 available hours per staff per month (1 FTE). 15% burden multiplier covers FICA, FUTA, SUTA, workers comp, and basic benefits. HealthArc bundles RPM device monitoring + CCM platform at ${haRate}/pt/mo. RingCentral ${rcRate}/pt/mo. Revenue reflects 2026 Medicare rates for stacked CCM + RPM. Fixed costs (Zivian ~$2,000/mo, EHR ~$650/mo) excluded from variable model. All values sync across Budget, Cash Flow, and CAC/LTV pages.
        <br /><br />
        <strong className="text-foreground-secondary font-medium">Built for FareRX MSO · Internal use only</strong>
      </div>
    </div>
  );
}
