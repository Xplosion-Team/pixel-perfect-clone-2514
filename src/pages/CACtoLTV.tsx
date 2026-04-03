import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SectionTag } from "@/components/ui/section-tag";
import { KPICard } from "@/components/ui/kpi-card";
import { InfoBox } from "@/components/ui/info-box";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/budget-data";
import { useCACLTVAssumptions, type CacItem } from "@/hooks/use-cac-ltv-assumptions";
import { Download, Plus, X, ChevronDown, ChevronUp, FileSpreadsheet, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart,
} from "recharts";

const BURDEN = 1.15;
const AVAIL = 160;

function fmt(n: number) { return "$" + Math.round(n).toLocaleString("en-US"); }
function fmt2(n: number) { return "$" + n.toFixed(2); }

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  Marketing: { bg: "bg-indigo-light", text: "text-indigo-dark" },
  Outreach: { bg: "bg-amber-light", text: "text-amber-dark" },
  Admin: { bg: "bg-muted", text: "text-foreground-secondary" },
  Other: { bg: "bg-green-light", text: "text-green-dark" },
};

interface SliderRowProps {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}
function SliderRow({ label, value, min, max, step, format, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3 mb-3 last:mb-0">
      <span className="text-xs text-foreground-muted w-[100px] md:w-[120px] shrink-0">{label}</span>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="flex-1" />
      <span className="font-mono text-xs font-medium text-foreground w-[60px] md:w-[72px] text-right shrink-0">{format(value)}</span>
    </div>
  );
}

export default function CACtoLTV() {
  const navigate = useNavigate();
  const { assumptions: a, updateAssumption, loaded, cacItems, totalCac, addCacItem, removeCacItem, updateCacItem } = useCACLTVAssumptions();
  const [promptOpen, setPromptOpen] = useState(false);

  const patients = a.patients;
  const rdRate = a.rdRate, rnRate = a.rnRate, maRate = a.maRate;
  const haRate = a.haRate, rcRate = a.rcRate;
  const rdHrs = a.rdHrs, rnHrs = a.rnHrs, maHrs = a.maHrs;
  const billingPct = a.billingPct, revPt = a.revPt;
  const ltvMonths = a.ltvMonths;
  const targetPts = a.targetPts, rampMo = a.rampMo, fixedCost = a.fixedCost;
  const mealEnabled = a.mealEnabled === 1;
  const mealPct = a.mealPct / 100, mealCap = a.mealCap, mealQty = a.mealQty;
  const mealRevPer = a.mealRevPer, mealCostPer = a.mealCostPer;

  // Economics
  const econ = useMemo(() => {
    const rdL = rdRate * rdHrs * BURDEN;
    const rnL = rnRate * rnHrs * BURDEN;
    const maL = maRate * maHrs * BURDEN;
    const bc = revPt * (billingPct / 100);
    const tv = rdL + rnL + maL + haRate + rcRate + bc;
    const tRev = revPt * patients;
    const tCost = tv * patients;
    const profit = tRev - tCost;
    const margin = tRev > 0 ? profit / tRev : 0;
    const gpPerPt = revPt - tv;
    return { rdL, rnL, maL, bc, tv, tRev, tCost, profit, margin, gpPerPt };
  }, [patients, rdRate, rnRate, maRate, haRate, rcRate, rdHrs, rnHrs, maHrs, billingPct, revPt]);

  // Meal delivery
  const meal = useMemo(() => {
    const revPtMo = mealQty * mealRevPer;
    const revPtAnnual = Math.min(revPtMo * 12, mealCap);
    const costPtAnnual = mealRevPer > 0 ? (revPtAnnual / mealRevPer) * mealCostPer : 0;
    const revPtEff = revPtAnnual / 12;
    const costPtEff = costPtAnnual / 12;
    const marginPtEff = revPtEff - costPtEff;
    const revBlend = revPtEff * mealPct;
    const marginBlend = marginPtEff * mealPct;
    const capMonths = revPtMo > 0 ? mealCap / revPtMo : 12;
    const marginPerMeal = mealRevPer - mealCostPer;
    const costBlend = costPtEff * mealPct;
    return { revPtMo, revPtEff, costPtEff, marginPtEff, revBlend, marginBlend, capMonths, marginPerMeal, revPtAnnual, costBlend };
  }, [mealQty, mealRevPer, mealCostPer, mealCap, mealPct]);

  // CAC & LTV
  const cac = useMemo(() => {
    const gpPt = Math.max(econ.gpPerPt, 1);
    const mealMargin = mealEnabled ? meal.marginBlend : 0;
    const gpWithMeal = gpPt + mealMargin;
    const ltv = gpWithMeal * ltvMonths;
    const ratio = totalCac > 0 ? ltv / totalCac : 0;
    const payback = gpWithMeal > 0 ? totalCac / gpWithMeal : 99;
    return { totalCac, ltv, ratio, payback, gpPt, gpWithMeal };
  }, [totalCac, ltvMonths, econ.gpPerPt, mealEnabled, meal.marginBlend]);

  // Budget
  const budget = useMemo(() => {
    const cacPt = totalCac;
    const totalCacBudget = cacPt * targetPts;
    const mealRevBlend = mealEnabled ? meal.revBlend : 0;
    const mealCostBlend = mealEnabled ? meal.costBlend : 0;
    const totalRevPt = revPt + mealRevBlend;
    const totalVcPt = econ.tv + mealCostBlend;
    const gpFull = (totalRevPt - totalVcPt) * targetPts - fixedCost;
    const pb = gpFull > 0 ? totalCacBudget / gpFull : 99;
    const totMo = Math.max(rampMo + 8, 12);
    const rows: any[] = [];
    let cum = 0;
    let be: number | null = null;
    for (let m = 1; m <= totMo; m++) {
      const p = m <= rampMo ? Math.round((m / rampMo) * targetPts) : targetPts;
      const pp = m > 1 && m <= rampMo ? Math.round(((m - 1) / rampMo) * targetPts) : m === 1 ? 0 : targetPts;
      const np = m <= rampMo ? p - pp : 0;
      const mCCM = revPt * p;
      const mMeal = mealRevBlend * p;
      const mVar = totalVcPt * p;
      const mC = cacPt * np;
      const mN = mCCM + mMeal - mVar - fixedCost - mC;
      cum += mN;
      if (cum >= 0 && !be) be = m;
      rows.push({ m, p, mCCM, mMeal, mR: mCCM + mMeal, mV: mVar, fx: fixedCost, mC, mN, cum });
    }
    const fullMonths = Math.max(0, 12 - rampMo);
    const rampGp = rows.slice(0, rampMo).reduce((a, r) => a + r.mN, 0);
    const yr1 = rampGp + (gpFull * fullMonths);
    return { totalCacBudget, gpFull, pb, rows, be, yr1, cacPt };
  }, [targetPts, rampMo, fixedCost, totalCac, revPt, econ.tv, mealEnabled, meal.revBlend, meal.costBlend]);

  // Capacity
  const capacity = useMemo(() => {
    const roles = [
      { id: "rd", hrs: rdHrs, label: "Dietitian (RD)" },
      { id: "rn", hrs: rnHrs, label: "Nurse (RN)" },
      { id: "ma", hrs: maHrs, label: "Medical assistant (MA)" },
    ];
    return roles.map((r) => {
      const used = r.hrs * patients;
      const maxP = Math.floor(AVAIL / r.hrs);
      const pct = used / AVAIL;
      return { ...r, used, maxP, pct };
    });
  }, [patients, rdHrs, rnHrs, maHrs]);

  const minMax = Math.min(...capacity.map((c) => c.maxP));
  const bottleneck = capacity.find((c) => c.maxP === minMax)!;

  const ratioVerdict = cac.ratio >= 5 ? "Excellent" : cac.ratio >= 3 ? "Good" : cac.ratio >= 1 ? "Developing" : "Below breakeven";

  const chartData = budget.rows.slice(0, 12).map((r) => ({
    name: `Mo ${r.m}`,
    ccmRev: r.mCCM,
    mealRev: mealEnabled ? r.mMeal : 0,
    cost: -(r.mV + r.fx + r.mC),
    cumulative: r.cum,
  }));

  // CAC by category
  const cacByCategory = useMemo(() => {
    const map: Record<string, { items: string[]; total: number }> = {};
    cacItems.forEach(i => {
      if (!map[i.cat]) map[i.cat] = { items: [], total: 0 };
      map[i.cat].items.push(i.name);
      map[i.cat].total += (i.amt || 0);
    });
    return Object.entries(map).map(([cat, d]) => ({
      cat, items: d.items.slice(0, 3).join(", ") + (d.items.length > 3 ? " +more" : ""),
      pp: d.total, tot: d.total * targetPts,
    }));
  }, [cacItems, targetPts]);

  // Summary assumptions table data
  const assumptionsTable = useMemo(() => {
    const rdMax = Math.floor(AVAIL / rdHrs), rnMax = Math.floor(AVAIL / rnHrs), maMax = Math.floor(AVAIL / maHrs);
    const mn = Math.min(rdMax, rnMax, maMax);
    const bottleRoles = [["RD", rdMax], ["RN", rnMax], ["MA", maMax]].filter(([, mx]) => mx === mn).map(([n]) => n).join(" & ");
    const fullMonths = Math.max(0, 12 - rampMo);
    return [
      { section: "Revenue" },
      { k: "Revenue per patient", v: `$${revPt}/mo (CCM + RPM stacked, 2026 rates)` },
      { k: "Active panel", v: `${patients} patients` },
      { k: "Monthly revenue", v: fmt(econ.tRev) },
      { section: "Cost structure" },
      { k: "HealthArc (RPM + CCM)", v: `$${haRate}/pt/mo · platform flat rate` },
      { k: "RingCentral", v: `$${rcRate}/pt/mo · communication platform` },
      { k: "RD (dietitian)", v: `$${rdRate}/hr × ${rdHrs.toFixed(2)} hr = ${fmt2(econ.rdL)}/pt loaded` },
      { k: "RN (nurse)", v: `$${rnRate}/hr × ${rnHrs.toFixed(2)} hr = ${fmt2(econ.rnL)}/pt loaded` },
      { k: "MA", v: `$${maRate}/hr × ${maHrs.toFixed(2)} hr = ${fmt2(econ.maL)}/pt loaded` },
      { k: "Billing & coding", v: `${billingPct.toFixed(1)}% of revenue = ${fmt2(econ.bc)}/pt` },
      { k: "Total variable cost", v: `${fmt2(econ.tv)}/pt · ${fmt2(econ.gpPerPt)}/pt gross profit` },
      { k: "Gross margin", v: `${(econ.margin * 100).toFixed(1)}% · target ≥ 25%` },
      { section: "Program budget" },
      { k: "Target panel", v: `${targetPts} patients · ${rampMo}-month ramp` },
      { k: "Total CAC budget", v: `${fmt(budget.totalCacBudget)} (${fmt(totalCac)}/pt one-time)` },
      { k: "Monthly profit at full panel", v: `${fmt(budget.gpFull)} after ${fmt(fixedCost)} fixed costs` },
      { k: "CAC payback period", v: budget.pb < 50 ? `${budget.pb.toFixed(1)} months after full ramp` : "N/A" },
      { k: "Est. year-1 gross profit", v: fmt(Math.max(budget.yr1, 0)) },
      { k: "Cumulative breakeven", v: budget.be ? `Month ${budget.be}` : "Beyond month 12" },
      { section: "Unit economics" },
      { k: "LTV : CAC ratio", v: `${cac.ratio.toFixed(1)}× · target ≥ 3×` },
      { k: "Patient LTV", v: fmt(cac.ltv) },
      { k: "CAC payback (LTV basis)", v: `${cac.payback.toFixed(1)} months to recover CAC` },
      { k: "Crew bottleneck", v: `${mn} pts (${bottleRoles} at capacity limit)` },
    ];
  }, [patients, rdRate, rnRate, maRate, haRate, rcRate, rdHrs, rnHrs, maHrs, billingPct, revPt, econ, budget, cac, targetPts, rampMo, fixedCost, totalCac, ltvMonths]);

  return (
    <>
      <SectionTag color="green">CAC to LTV — Patient Unit Economics</SectionTag>
      <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-1">Patient Economics Calculator</h1>
      <p className="text-xs text-foreground-secondary mb-5 max-w-[720px] leading-relaxed">
        CCM + RPM · HealthArc ${haRate}/pt · RingCentral ${rcRate}/pt · 2026 Medicare rates. Target: {targetPts} patients initial milestone.
      </p>

      {/* Global patient slider */}
      <Card className="mb-5" data-tour="cac-patients">
        <CardContent className="flex flex-wrap items-center gap-4 p-4 md:p-5">
          <div className="min-w-[100px]">
            <p className="text-sm font-medium text-foreground">Active patients</p>
            <p className="text-xs text-foreground-muted">Drives all sections</p>
          </div>
          <Slider value={[patients]} min={10} max={300} step={5} onValueChange={([v]) => updateAssumption("patients", v)} className="flex-[2] min-w-[140px]" />
          <span className="font-mono text-2xl md:text-3xl font-medium text-foreground min-w-[52px] text-right">{patients}</span>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="mb-8">
        <TabsList className="w-full justify-start mb-4 md:mb-6 overflow-x-auto">
          <TabsTrigger value="summary" className="text-xs md:text-sm">Summary</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs md:text-sm">Budget</TabsTrigger>
          <TabsTrigger value="economics" className="text-xs md:text-sm">Economics</TabsTrigger>
          <TabsTrigger value="ltv" className="text-xs md:text-sm">CAC & LTV</TabsTrigger>
        </TabsList>

        {/* ═══ EXECUTIVE SUMMARY ═══ */}
        <TabsContent value="summary">
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Key metrics</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <KPICard color="green" label="Monthly revenue" value={fmt(econ.tRev)} subtitle={`at ${patients} patients`} />
            <KPICard color={econ.margin >= 0.30 ? "green" : "coral"} label="Gross margin" value={`${(econ.margin * 100).toFixed(1)}%`} subtitle={`${fmt2(econ.gpPerPt)}/pt profit`} />
            <KPICard color={cac.ratio >= 5 ? "green" : cac.ratio >= 3 ? "blue" : "coral"} label="LTV : CAC ratio" value={`${cac.ratio.toFixed(1)}×`} subtitle="target ≥ 3×" />
            <KPICard color={budget.be && budget.be <= 6 ? "green" : "blue"} label="Breakeven month" value={budget.be ? `Mo ${budget.be}` : "N/A"} subtitle="cumulative cash positive" />
          </div>

          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">
            Program budget — {targetPts} patient target · {rampMo}-month ramp
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">Total CAC budget</p>
              <p className="font-mono text-base md:text-lg font-medium">{fmt(budget.totalCacBudget)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">{fmt(totalCac)}/pt · {cacItems.length} assumptions</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">Monthly profit at full panel</p>
              <p className={`font-mono text-base md:text-lg font-medium ${budget.gpFull >= 0 ? "text-green" : "text-destructive"}`}>{fmt(budget.gpFull)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">after {fmt(fixedCost)} fixed costs</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">CAC payback</p>
              <p className={`font-mono text-base md:text-lg font-medium ${budget.pb <= 6 ? "text-green" : budget.pb <= 12 ? "text-foreground" : "text-destructive"}`}>{budget.pb < 50 ? `${budget.pb.toFixed(1)} mo` : "N/A"}</p>
              <p className="text-[11px] text-foreground-muted mt-1">after full ramp</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">Year-1 gross profit est.</p>
              <p className={`font-mono text-base md:text-lg font-medium ${budget.yr1 > 0 ? "text-green" : "text-destructive"}`}>{fmt(Math.max(budget.yr1, 0))}</p>
              <p className="text-[11px] text-foreground-muted mt-1">ramp + {Math.max(0, 12 - rampMo)} full months</p>
            </div>
          </div>

          {/* Dynamic insights */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Walking-away points — dynamic insights</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <InfoBox variant={econ.margin >= 0.35 ? "success" : econ.margin < 0.25 ? "warning" : "note"} title={econ.margin >= 0.35 ? `Strong gross margin at ${(econ.margin * 100).toFixed(1)}%` : `Gross margin at ${(econ.margin * 100).toFixed(1)}%`}>
              Variable cost is {fmt2(econ.tv)}/pt against {fmt2(revPt)}/pt revenue. Gross profit is {fmt2(econ.gpPerPt)}/pt.
            </InfoBox>
            <InfoBox variant={patients < minMax * 0.7 ? "success" : patients >= minMax ? "warning" : "note"} title={patients < minMax ? `One crew scales to ${minMax} patients` : `${bottleneck.label} at capacity`}>
              {patients < minMax
                ? `At ${patients} patients your team is at ${Math.round((patients / minMax) * 100)}% of capacity. Scale to ${minMax} before adding staff.`
                : `At ${patients} patients your ${bottleneck.label} is over the 160 hr/mo limit. Add a part-time resource.`}
            </InfoBox>
            <InfoBox variant={cac.ratio >= 5 ? "success" : cac.ratio < 3 ? "warning" : "note"} title={`LTV:CAC of ${cac.ratio.toFixed(1)}× — ${ratioVerdict}`}>
              Every $1 of CAC returns ${cac.ratio.toFixed(1)} in lifetime gross profit. At {fmt(totalCac)} CAC, payback is {cac.payback.toFixed(1)} months.
            </InfoBox>
            <InfoBox variant={budget.be && budget.be <= 6 ? "success" : budget.be && budget.be > 9 ? "warning" : "note"} title={budget.be ? `Cash positive by month ${budget.be}` : "No breakeven in 12 months"}>
              {budget.be
                ? budget.be <= 6
                  ? "Sub-6-month cumulative breakeven is strong. Physician referral acquisition keeps CAC low."
                  : `Pulling the ramp from ${rampMo} to ${Math.max(1, rampMo - 1)} months is the single biggest lever to shorten it.`
                : "Check fixed costs, variable cost, and ramp speed. Margin may be too thin at this panel size."}
            </InfoBox>
          </div>

          {/* Assumptions table */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Key assumptions at a glance</div>
          <Card className="mb-6">
            <CardContent className="p-0">
              <table className="w-full text-[12px]">
                <tbody>
                  {assumptionsTable.map((row, i) =>
                    "section" in row ? (
                      <tr key={i}>
                        <td colSpan={2} className="px-4 pt-3 pb-1 font-mono text-[10px] tracking-wider uppercase text-foreground-muted border-b border-border">— {row.section} —</td>
                      </tr>
                    ) : (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 text-foreground-secondary">{row.k}</td>
                        <td className="px-4 py-2 font-mono text-xs font-medium text-right">{row.v}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Cost structure formula */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Cost structure</div>
          <div className="flex flex-wrap items-center gap-2 bg-muted border border-border rounded-lg p-3 mb-6">
            <span className="font-mono text-[11px] bg-background border border-border rounded-md px-2 py-1">RD {fmt2(econ.rdL)}</span>
            <span className="text-foreground-muted text-xs">+</span>
            <span className="font-mono text-[11px] bg-background border border-border rounded-md px-2 py-1">RN {fmt2(econ.rnL)}</span>
            <span className="text-foreground-muted text-xs">+</span>
            <span className="font-mono text-[11px] bg-background border border-border rounded-md px-2 py-1">MA {fmt2(econ.maL)}</span>
            <span className="text-foreground-muted text-xs">+</span>
            <span className="font-mono text-[11px] bg-background border border-border rounded-md px-2 py-1">HealthArc ${haRate}</span>
            <span className="text-foreground-muted text-xs">+</span>
            <span className="font-mono text-[11px] bg-background border border-border rounded-md px-2 py-1">RingCentral ${rcRate}</span>
            <span className="text-foreground-muted text-xs">+</span>
            <span className="font-mono text-[11px] bg-background border border-border rounded-md px-2 py-1">Billing {billingPct}%</span>
            <span className="text-foreground-muted text-xs">=</span>
            <span className="font-mono text-[11px] font-semibold bg-background border border-border rounded-md px-2 py-1">{fmt2(econ.tv)}/pt</span>
          </div>

          {/* Generate button */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button onClick={() => navigate("/cash-flow")} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              <BarChart3 className="w-4 h-4" /> View Cash Flow Model
            </button>
          </div>
        </TabsContent>

        {/* ═══ ACQUISITION BUDGET ═══ */}
        <TabsContent value="budget">
          <h2 className="text-base md:text-lg font-medium mb-1">Patient acquisition budget</h2>
          <p className="text-xs text-foreground-muted mb-4 max-w-[640px] leading-relaxed">
            Full launch checkbook — all-in CAC from your assumption list, meal delivery revenue folded in if enabled, month-by-month cash flow through breakeven.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <Card>
              <CardContent className="p-4 md:p-5">
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">Acquisition targets</p>
                <SliderRow label="Target patients" value={targetPts} min={25} max={300} step={5} format={(v) => `${v} pts`} onChange={(v) => updateAssumption("targetPts", v)} />
                <SliderRow label="Ramp (months)" value={rampMo} min={1} max={12} step={1} format={(v) => `${v} mo`} onChange={(v) => updateAssumption("rampMo", v)} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 md:p-5">
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">Fixed overhead</p>
                <SliderRow label="Fixed cost / mo" value={fixedCost} min={1000} max={10000} step={250} format={(v) => fmt(v)} onChange={(v) => updateAssumption("fixedCost", v)} />
                <div className="mt-3 pt-3 border-t border-border text-xs text-foreground-muted">
                  Variable cost auto-syncs from Economics tab · <span className="font-mono font-medium text-foreground">{fmt(Math.round(econ.tv))}/pt</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meal delivery status bar */}
          {mealEnabled && (
            <div className="bg-green-light border border-green rounded-lg p-3 mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-green-dark">Meal delivery enabled</span>
              <div className="flex flex-wrap gap-4 text-xs font-mono">
                <span className="text-foreground-secondary">Rev/pt: <span className="font-medium text-green">{fmt(meal.revBlend)}</span></span>
                <span className="text-foreground-secondary">Cost/pt: <span className="font-medium">{fmt(meal.costBlend)}</span></span>
                <span className="text-foreground-secondary">Margin/pt: <span className="font-medium text-green">{fmt(meal.marginBlend)}</span></span>
                <span className="text-foreground-secondary">Enrolled: <span className="font-medium">{a.mealPct}%</span></span>
              </div>
            </div>
          )}

          <div className="text-[9px] font-semibold uppercase tracking-[0.04em] text-foreground-secondary mb-2">
            Budget summary — {targetPts} patients · {rampMo}-month ramp
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
            <KPICard color="blue" label="All-in CAC budget" value={fmt(budget.totalCacBudget)} subtitle={`${fmt(totalCac)} × ${targetPts} pts`} />
            <KPICard color={budget.gpFull >= 0 ? "green" : "coral"} label="Monthly profit at full panel" value={fmt(budget.gpFull)} subtitle={mealEnabled ? "incl. meal delivery" : "after fixed costs"} />
            <KPICard color={budget.pb <= 6 ? "green" : "blue"} label="CAC payback" value={budget.pb < 50 ? `${budget.pb.toFixed(1)} mo` : "N/A"} subtitle="after full ramp" />
            <KPICard color={budget.be && budget.be <= 6 ? "green" : "blue"} label="Cumulative breakeven" value={budget.be ? `Mo ${budget.be}` : "N/A"} subtitle="first positive month" />
          </div>

          {/* Meal budget row */}
          {mealEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-[11px] text-foreground-muted mb-1">Meal program revenue / mo</p>
                <p className="font-mono text-base font-medium">{fmt(meal.revBlend * targetPts)}</p>
                <p className="text-[11px] text-foreground-muted mt-1">{fmt(meal.revBlend)} × {targetPts} pts</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-[11px] text-foreground-muted mb-1">Meal program cost / mo</p>
                <p className="font-mono text-base font-medium">{fmt(meal.costBlend * targetPts)}</p>
                <p className="text-[11px] text-foreground-muted mt-1">{fmt(meal.costBlend)} × {targetPts} pts</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-[11px] text-foreground-muted mb-1">Meal program margin / mo</p>
                <p className={`font-mono text-base font-medium ${meal.marginBlend >= 0 ? "text-green" : "text-destructive"}`}>{fmt(meal.marginBlend * targetPts)}</p>
                <p className="text-[11px] text-foreground-muted mt-1">{fmt(meal.marginBlend)} × {targetPts} pts</p>
              </div>
            </div>
          )}

          {/* CAC breakdown by category */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.04em] text-foreground-secondary mb-2">CAC budget breakdown — from assumption list</div>
          <div className="overflow-x-auto mb-5 -mx-4 px-4 pb-4 md:mx-0 md:px-0 md:pb-0 scrollbar-thin">
            <table className="w-full border-collapse text-[11px]" style={{ minWidth: 540 }}>
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left p-2 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">Category</th>
                  <th className="text-left p-2 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">Line items</th>
                  <th className="text-right p-2 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">Per patient</th>
                  <th className="text-right p-2 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">× panel</th>
                  <th className="text-right p-2 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">Total budget</th>
                </tr>
              </thead>
              <tbody>
                {cacByCategory.map(r => (
                  <tr key={r.cat} className="border-b border-border">
                    <td className="p-2 font-medium">{r.cat}</td>
                    <td className="p-2 text-foreground-muted text-[10px]">{r.items}</td>
                    <td className="text-right font-mono p-2">{fmt(r.pp)}</td>
                    <td className="text-right text-foreground-muted p-2">× {targetPts}</td>
                    <td className="text-right font-mono font-medium p-2">{fmt(r.tot)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border bg-muted font-medium">
                  <td className="p-2 font-semibold">Total all-in CAC</td>
                  <td className="p-2" />
                  <td className="text-right font-mono p-2">{fmt(totalCac)}</td>
                  <td className="text-right text-foreground-muted p-2">× {targetPts}</td>
                  <td className="text-right font-mono font-semibold p-2">{fmt(budget.totalCacBudget)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Ramp chart */}
          <h3 className="text-sm font-medium mb-1">Month-by-month ramp & cash flow</h3>
          <p className="text-xs text-foreground-muted mb-3">Revenue includes meal delivery if enabled. Red line = cumulative cash from day one.</p>

          <div className="flex flex-wrap gap-4 mb-3 text-xs text-foreground-muted">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-green opacity-40" /> CCM + RPM revenue</span>
            {mealEnabled && <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-green-dark opacity-60" /> Meal delivery revenue</span>}
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-amber opacity-40" /> Total cost</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 rounded bg-destructive mt-1" /> Cumulative cash</span>
          </div>

          <div className="bg-card rounded-lg p-3 mb-3">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 0% / 0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(48 4% 56%)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(48 4% 56%)", fontSize: 8, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v < 0 ? "-$" : "$"}${Math.abs(Math.round(v / 1000))}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="ccmRev" name="CCM + RPM revenue" fill="rgba(29,158,117,0.35)" radius={[3, 3, 0, 0]} stackId="rev" />
                {mealEnabled && <Bar dataKey="mealRev" name="Meal delivery" fill="rgba(15,110,86,0.55)" radius={[3, 3, 0, 0]} stackId="rev" />}
                <Bar dataKey="cost" name="Total cost" fill="rgba(186,117,23,0.25)" radius={[3, 3, 0, 0]} />
                <Line dataKey="cumulative" name="Cumulative cash" type="monotone" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Ramp table */}
          <div className="overflow-x-auto mb-5 -mx-4 px-4 pb-6 md:mx-0 md:px-0 md:pb-0 scrollbar-thin">
            <table className="w-full border-collapse text-[9px]" style={{ minWidth: mealEnabled ? 780 : 680 }}>
              <thead>
                <tr className="border-b border-border">
                  {["Month", "Patients", "CCM+RPM rev", ...(mealEnabled ? ["Meal rev"] : []), "Variable cost", "Fixed cost", "CAC spend", "Net cash", "Cumulative"].map((h) => (
                    <th key={h} className={`p-1.5 text-[8px] font-semibold uppercase tracking-wider text-foreground-muted ${h !== "Month" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budget.rows.slice(0, 12).map((r) => (
                  <tr key={r.m} className={`border-b border-border ${r.m === budget.be ? "bg-green-light/30" : ""}`}>
                    <td className="p-1.5 text-foreground-muted">{r.m === budget.be ? "✓ " : ""}Month {r.m}</td>
                    <td className="text-right font-mono p-1.5">{r.p}</td>
                    <td className="text-right font-mono p-1.5">{fmt(r.mCCM)}</td>
                    {mealEnabled && <td className="text-right font-mono p-1.5 text-green">{fmt(r.mMeal)}</td>}
                    <td className="text-right font-mono text-foreground-muted p-1.5">{fmt(r.mV)}</td>
                    <td className="text-right font-mono text-foreground-muted p-1.5">{fmt(r.fx)}</td>
                    <td className="text-right font-mono text-foreground-muted p-1.5">{r.mC > 0 ? fmt(r.mC) : "—"}</td>
                    <td className={`text-right font-mono p-1.5 ${r.mN >= 0 ? "text-green" : "text-destructive"}`}>{fmt(r.mN)}</td>
                    <td className={`text-right font-mono font-medium p-1.5 ${r.cum >= 0 ? "text-green" : "text-destructive"}`}>{fmt(r.cum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <InfoBox variant="emphasis" title="Budget summary">
            At <strong>{targetPts} patients</strong> and a <strong>{rampMo}-month ramp</strong>, all-in CAC budget is <strong>{fmt(budget.totalCacBudget)}</strong> ({fmt(totalCac)}/patient across {cacItems.length} assumptions). Monthly profit at full panel is <strong>{fmt(budget.gpFull)}</strong> after {fmt(fixedCost)} fixed costs.
            {mealEnabled && ` Meal delivery adds ${fmt(meal.revBlend * targetPts)}/mo revenue and ${fmt(meal.marginBlend * targetPts)}/mo margin at full panel.`}
            {" "}Cumulative breakeven in <strong>{budget.be ? `month ${budget.be}` : "beyond month 12"}</strong>.
          </InfoBox>

          {/* Generate button */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button onClick={() => navigate("/cash-flow")} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              <BarChart3 className="w-4 h-4" /> Generate Cash Flow Model
            </button>
          </div>
        </TabsContent>

        {/* ═══ ECONOMICS MODEL ═══ */}
        <TabsContent value="economics">
          <InfoBox variant="success" title="Lemonade stand version">
            Each patient pays you ${revPt}/month. You pay workers to serve them. Whatever is left is gross profit. The goal: add more patients using the same crew before needing to hire.
          </InfoBox>

          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Monthly summary</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">Revenue</p>
              <p className="font-mono text-base md:text-lg font-medium">{fmt(econ.tRev)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">{fmt2(revPt)} × {patients} pts</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">Variable cost</p>
              <p className="font-mono text-base md:text-lg font-medium">{fmt(econ.tCost)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">{fmt2(econ.tv)} × {patients} pts</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">Gross profit</p>
              <p className={`font-mono text-base md:text-lg font-medium ${econ.profit >= 0 ? "text-green" : "text-destructive"}`}>{fmt(econ.profit)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">before fixed costs</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">Gross margin</p>
              <p className={`font-mono text-base md:text-lg font-medium ${econ.margin >= 0.25 ? "text-green" : "text-destructive"}`}>{(econ.margin * 100).toFixed(1)}%</p>
              <p className="text-[11px] text-foreground-muted mt-1">target ≥ 25%</p>
            </div>
          </div>

          <h3 className="text-sm font-medium mb-1">Staff & platform assumptions</h3>
          <p className="text-xs text-foreground-muted mb-4">15% burden on labor. HealthArc and RingCentral are flat platform rates — no burden applied.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex gap-2 mb-3 flex-wrap">
                  <span className="text-[11px] font-medium bg-green-light text-green-dark px-2.5 py-0.5 rounded-full">HealthArc ${haRate}/pt</span>
                  <span className="text-[11px] font-medium bg-indigo-light text-indigo-dark px-2.5 py-0.5 rounded-full">RingCentral ${rcRate}/pt</span>
                </div>
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">Hourly rates</p>
                <SliderRow label="RD rate" value={rdRate} min={25} max={70} step={1} format={(v) => `$${v}/hr`} onChange={(v) => updateAssumption("rdRate", v)} />
                <SliderRow label="RN rate" value={rnRate} min={30} max={80} step={1} format={(v) => `$${v}/hr`} onChange={(v) => updateAssumption("rnRate", v)} />
                <SliderRow label="MA rate" value={maRate} min={15} max={40} step={1} format={(v) => `$${v}/hr`} onChange={(v) => updateAssumption("maRate", v)} />
                <SliderRow label="HealthArc" value={haRate} min={8} max={40} step={1} format={(v) => `$${v}/pt`} onChange={(v) => updateAssumption("haRate", v)} />
                <SliderRow label="RingCentral" value={rcRate} min={0} max={15} step={1} format={(v) => `$${v}/pt`} onChange={(v) => updateAssumption("rcRate", v)} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 md:p-5">
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">
                  Time per patient / month <span className="text-foreground-muted font-normal text-xs ml-2">CCM min = 20 min</span>
                </p>
                <SliderRow label="RD time" value={rdHrs} min={0.1} max={2} step={0.05} format={(v) => `${v.toFixed(2)} hr`} onChange={(v) => updateAssumption("rdHrs", v)} />
                <SliderRow label="RN time" value={rnHrs} min={0.1} max={2} step={0.05} format={(v) => `${v.toFixed(2)} hr`} onChange={(v) => updateAssumption("rnHrs", v)} />
                <SliderRow label="MA time" value={maHrs} min={0.1} max={2} step={0.05} format={(v) => `${v.toFixed(2)} hr`} onChange={(v) => updateAssumption("maHrs", v)} />
                <SliderRow label="Billing %" value={billingPct} min={2} max={8} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={(v) => updateAssumption("billingPct", v)} />
              </CardContent>
            </Card>
          </div>

          <Card className="mb-5">
            <CardContent className="flex flex-wrap items-center gap-4 p-4 md:p-5">
              <div className="min-w-[140px]">
                <p className="text-[13px] font-medium">Revenue per patient / month</p>
                <p className="text-xs text-foreground-muted">Stacked CCM + RPM · 2026 Medicare rates</p>
              </div>
              <Slider value={[revPt]} min={100} max={250} step={1} onValueChange={([v]) => updateAssumption("revPt", v)} className="flex-1 min-w-[120px]" />
              <span className="font-mono text-xl font-medium text-green min-w-[80px] text-right">${revPt}</span>
            </CardContent>
          </Card>

          {/* Cost table */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Per-patient cost breakdown</div>
          <div className="overflow-x-auto mb-5 -mx-4 px-4 pb-4 md:mx-0 md:px-0 md:pb-0 scrollbar-thin">
            <table className="w-full border-collapse text-[11px]" style={{ minWidth: 480 }}>
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left p-2 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">Role / line item</th>
                  <th className="text-right p-2 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">Per patient</th>
                  <th className="text-right p-2 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">× panel</th>
                  <th className="text-right p-2 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">Monthly total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Dietitian (RD)", sub: `${fmt2(rdRate * rdHrs)} base × 1.15 burden`, pp: econ.rdL, tot: econ.rdL * patients },
                  { label: "Nurse (RN)", sub: `${fmt2(rnRate * rnHrs)} base × 1.15 burden`, pp: econ.rnL, tot: econ.rnL * patients },
                  { label: "Medical assistant (MA)", sub: `${fmt2(maRate * maHrs)} base × 1.15 burden`, pp: econ.maL, tot: econ.maL * patients },
                  { label: "HealthArc (RPM + CCM)", sub: "Platform flat rate — device + monitoring + CCM", pp: haRate, tot: haRate * patients },
                  { label: "RingCentral", sub: "Communication platform flat rate", pp: rcRate, tot: rcRate * patients },
                  { label: "Billing & coding", sub: `${billingPct.toFixed(1)}% of ${fmt2(revPt)}`, pp: econ.bc, tot: econ.bc * patients },
                  { label: "Total variable cost", sub: "", pp: econ.tv, tot: econ.tCost, bold: true },
                ].map((r) => (
                  <tr key={r.label} className={`border-b border-border ${r.bold ? "bg-muted font-medium" : ""}`}>
                    <td className="p-2">
                      <div className={r.bold ? "font-semibold" : ""}>{r.label}</div>
                      {r.sub && <div className="text-[10px] text-foreground-muted">{r.sub}</div>}
                    </td>
                    <td className="text-right font-mono p-2">{fmt2(r.pp)}</td>
                    <td className="text-right text-foreground-muted p-2">× {patients}</td>
                    <td className="text-right font-mono font-medium p-2">{fmt(r.tot)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Crew capacity */}
          <h3 className="text-sm font-medium mb-1">Crew capacity</h3>
          <p className="text-xs text-foreground-muted mb-4">Each staff member has ~160 hrs/month. Green = comfortable. Amber = approaching limit. Red = need a second hire.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {capacity.map((c) => {
              const col = c.pct < 0.7 ? "hsl(var(--green))" : c.pct < 0.9 ? "hsl(var(--amber))" : "hsl(var(--destructive))";
              const [badge, cls] = c.pct < 0.7 ? ["OK", "bg-green-light text-green"] : c.pct < 1 ? ["Near limit", "bg-amber-light text-amber"] : ["Overloaded", "bg-red-light text-destructive"];
              return (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <p className="text-xs text-foreground-muted mb-2">{c.label}</p>
                    <div className="h-[5px] bg-muted rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(c.pct, 1) * 100}%`, backgroundColor: col }} />
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="font-mono text-xs font-medium">{c.used.toFixed(0)} hrs used</p>
                        <p className="text-[10px] text-foreground-muted">max solo: {c.maxP} pts</p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{badge}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <InfoBox variant={patients <= minMax ? "success" : "warning"} title={patients <= minMax ? `One crew handles ${patients} patients comfortably` : `${bottleneck.label} is at capacity`}>
            {patients <= minMax
              ? `Bottleneck is ${bottleneck.label} at ${minMax} patients. Scale up before adding staff.`
              : `At ${patients} patients, ${bottleneck.label} exceeds their 160-hour monthly limit. Add part-time resource before growing further.`}
          </InfoBox>
        </TabsContent>

        {/* ═══ CAC & LTV ═══ */}
        <TabsContent value="ltv">
          {/* Reimbursability note */}
          <div className="bg-indigo-light border-l-[3px] border-indigo rounded-r-lg p-3.5 mb-5">
            <p className="text-[13px] font-medium text-indigo-dark mb-1">RPM device is not a CAC cost — it's reimbursable through HealthArc</p>
            <p className="text-[13px] text-indigo leading-relaxed">
              The physical device is bundled into HealthArc's ${haRate}/pt/mo platform fee (CPT 99454 supply + monitoring). Medicare reimburses device setup via CPT 99453 (~$18–20 one-time). Net device cost to the practice is effectively <strong>$0</strong>. CAC should only include spend you do <em>not</em> get back.
            </p>
          </div>

          {/* CAC assumption prompt */}
          <Card className="mb-5">
            <CardContent className="p-4">
              <button onClick={() => setPromptOpen(!promptOpen)} className="flex items-center justify-between w-full text-left">
                <span className="text-[13px] font-medium">CAC assumption prompt — what should be on your list?</span>
                {promptOpen ? <ChevronUp className="w-4 h-4 text-foreground-muted" /> : <ChevronDown className="w-4 h-4 text-foreground-muted" />}
              </button>
              {promptOpen && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[13px] text-foreground-secondary leading-relaxed mb-3">Walk through each category and ask: <em>what do we actually spend to convert one referred patient into an active enrolled member?</em></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium mb-1">Marketing & awareness</p>
                      <p className="text-foreground-muted leading-relaxed">· Digital / social advertising per conversion<br />· Flyers, mailers, print materials<br />· Community health event booth cost<br />· Referral incentive or co-marketing fee<br />· Branded patient outreach collateral</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Physician relationship building</p>
                      <p className="text-foreground-muted leading-relaxed">· Rep or liaison time per enrolled patient<br />· Office lunch / detail visit cost<br />· EMR integration or data-sharing setup<br />· Referral tracking / attribution cost<br />· Provider education on program eligibility</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Enrollment & onboarding</p>
                      <p className="text-foreground-muted leading-relaxed">· Staff hours for intake, consent, setup<br />· Insurance eligibility verification<br />· PECOS / payer credentialing lookup<br />· Welcome call / first care plan session<br />· Patient education materials (not device)</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1 text-destructive">What does NOT belong in CAC</p>
                      <p className="text-destructive/70 leading-relaxed">· RPM device (reimbursed via 99453/99454)<br />· Monthly platform fees (HealthArc, RingCentral)<br />· Ongoing clinical labor (that's COGS)<br />· Fixed overhead (EHR, Zivian, malpractice)<br />· Equipment already owned or donated</p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-muted rounded-lg text-xs text-foreground-secondary">
                    <strong className="text-foreground">Rule of thumb:</strong> For a physician-referral-only CCM launch, realistic all-in CAC is <strong>$75–$150/patient</strong>. If you're adding paid digital marketing, plan for <strong>$150–$300</strong>. Above $400 means your channel economics need rethinking.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dynamic CAC assumptions list */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary">CAC assumptions — one-time cost per enrolled patient</span>
            <button onClick={addCacItem} className="flex items-center gap-1 text-xs font-medium text-green bg-green-light border border-green rounded-full px-3 py-1 hover:opacity-80 transition-opacity">
              <Plus className="w-3 h-3" /> Add assumption
            </button>
          </div>

          <Card className="mb-1">
            <CardContent className="p-0">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted border-b border-border rounded-t-lg">
                <span className="font-mono text-[10px] tracking-wider uppercase text-foreground-muted">Assumption — click name to edit · drag slider to adjust</span>
                <span className="font-mono text-[10px] tracking-wider uppercase text-foreground-muted">$/patient</span>
              </div>
              {/* Scrollable list */}
              <div className="max-h-[340px] overflow-y-auto divide-y divide-border">
                {cacItems.map((item) => {
                  const catStyle = CAT_COLORS[item.cat] || CAT_COLORS.Other;
                  return (
                    <div key={item.id} className="px-4 py-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateCacItem(item.id, { name: e.target.value })}
                          className="flex-1 text-[13px] bg-transparent border-b border-transparent focus:border-green outline-none min-w-0 py-0.5"
                        />
                        <select
                          value={item.cat}
                          onChange={(e) => updateCacItem(item.id, { cat: e.target.value as CacItem["cat"] })}
                          className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded-full border border-border cursor-pointer appearance-none text-center ${catStyle.bg} ${catStyle.text}`}
                        >
                          <option value="Marketing">Marketing</option>
                          <option value="Outreach">Outreach</option>
                          <option value="Admin">Admin</option>
                          <option value="Other">Other</option>
                        </select>
                        <button onClick={() => removeCacItem(item.id)} className="text-foreground-muted hover:text-destructive transition-colors p-0.5 shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="range"
                          min={0}
                          max={item.amt > 150 ? Math.ceil(item.amt / 50) * 50 + 50 : 200}
                          step={5}
                          value={item.amt}
                          onChange={(e) => updateCacItem(item.id, { amt: Number(e.target.value) })}
                          className="flex-1 h-1.5 accent-green cursor-pointer"
                        />
                        <span className="font-mono text-[13px] font-medium text-right min-w-[44px]">{fmt(item.amt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Total row */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted border-t border-border rounded-b-lg">
                <span className="text-[13px] font-medium">Total all-in CAC</span>
                <span className="font-mono text-[15px] font-medium">{fmt(totalCac)}</span>
              </div>
            </CardContent>
          </Card>
          <p className="text-[11px] text-foreground-muted mb-6">Click any name to rename it · change category with the dropdown · slide to adjust amount · × to remove</p>

          <hr className="border-border mb-6" />

          {/* ─── Meal delivery ─── */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Optional add-on — food as medicine (capped benefit program)</div>
          <Card className={`mb-6 ${mealEnabled ? "border-green" : ""}`}>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[13px] font-medium">Medical meal delivery</p>
                  <p className="text-xs text-foreground-muted mt-1 leading-relaxed">Capped annual benefit per patient. Payer, grant, or self-funded. Deliveries stop or shift to self-pay once the cap is hit.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-foreground-secondary">Enable</span>
                  <Switch checked={mealEnabled} onCheckedChange={(v) => updateAssumption("mealEnabled", v ? 1 : 0)} />
                </div>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 ${!mealEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="bg-muted rounded-lg p-3.5">
                  <p className="font-mono text-[10px] tracking-wider uppercase text-foreground-muted mb-3">Enrollment & cap</p>
                  <SliderRow label="Patients enrolled" value={a.mealPct} min={5} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => updateAssumption("mealPct", v)} />
                  <SliderRow label="Annual cap / pt" value={mealCap} min={60} max={1200} step={60} format={(v) => fmt(v)} onChange={(v) => updateAssumption("mealCap", v)} />
                  <div className="mt-2 pt-2 border-t border-border text-[11px] text-foreground-muted">
                    Cap exhausted: <span className="font-mono font-medium text-foreground">{meal.capMonths >= 12 ? "not hit in 12 mo" : `month ${meal.capMonths.toFixed(1)}`}</span>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3.5">
                  <p className="font-mono text-[10px] tracking-wider uppercase text-foreground-muted mb-3">Unit economics</p>
                  <SliderRow label="Meals / pt / mo" value={mealQty} min={2} max={30} step={1} format={(v) => `${v}`} onChange={(v) => updateAssumption("mealQty", v)} />
                  <SliderRow label="Revenue / meal" value={mealRevPer} min={3} max={25} step={1} format={(v) => fmt(v)} onChange={(v) => updateAssumption("mealRevPer", v)} />
                  <SliderRow label="Cost / meal" value={mealCostPer} min={1} max={20} step={1} format={(v) => fmt(v)} onChange={(v) => updateAssumption("mealCostPer", v)} />
                  <div className="mt-2 pt-2 border-t border-border text-[11px] text-foreground-muted">
                    Margin / meal: <span className="font-mono font-medium text-green">{fmt(meal.marginPerMeal)}/meal</span>
                  </div>
                </div>
              </div>

              {/* Cap progress bar */}
              <div className={`mb-4 pb-4 border-b border-border ${!mealEnabled ? "opacity-40" : ""}`}>
                <div className="flex justify-between mb-1.5 text-[11px] text-foreground-muted">
                  <span>Annual cap usage over 12 months</span>
                  <span className="font-mono">{fmt(meal.revPtAnnual)} / {fmt(mealCap)} cap used</span>
                </div>
                <div className="h-[6px] bg-background-muted rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min((meal.capMonths / 12) * 100, 100)}%`,
                    backgroundColor: meal.capMonths >= 12 ? "hsl(var(--green))" : "hsl(var(--amber))",
                  }} />
                </div>
                <div className="flex justify-between text-[10px] text-foreground-muted font-mono">
                  <span>Mo 1</span>
                  <span>{meal.capMonths >= 12 ? "cap not reached" : `cap hit ~mo ${meal.capMonths.toFixed(1)}`}</span>
                  <span>Mo 12</span>
                </div>
              </div>

              {/* Impact grid */}
              <div className={`grid grid-cols-2 gap-2 ${!mealEnabled ? "opacity-40" : ""}`}>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-[10px] text-foreground-muted mb-1">Rev / enrolled pt / mo</p>
                  <p className="font-mono text-base font-medium">{fmt(meal.revPtEff)}</p>
                  <p className="text-[10px] text-foreground-muted mt-1">{mealQty} meals × {fmt(mealRevPer)} (cap: {fmt(mealCap)}/yr)</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-[10px] text-foreground-muted mb-1">Blended margin / all pts</p>
                  <p className={`font-mono text-base font-medium ${meal.marginBlend >= 0 ? "text-green" : "text-destructive"}`}>{fmt(meal.marginBlend)}</p>
                  <p className="text-[10px] text-foreground-muted mt-1">{fmt(meal.marginPtEff)}/enrolled × {a.mealPct}%</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-[10px] text-foreground-muted mb-1">Monthly panel lift</p>
                  <p className="font-mono text-base font-medium text-green">+{fmt(meal.marginBlend * patients)}</p>
                  <p className="text-[10px] text-foreground-muted mt-1">at {patients} pts</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-[10px] text-foreground-muted mb-1">LTV lift / patient</p>
                  <p className="font-mono text-base font-medium text-green">+{fmt(meal.marginBlend * ltvMonths)}</p>
                  <p className="text-[10px] text-foreground-muted mt-1">{fmt(meal.marginBlend)} × {ltvMonths} mo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <hr className="border-border mb-6" />

          {/* LTV inputs */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">LTV inputs</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <Card>
              <CardContent className="p-4 md:p-5">
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">Retention</p>
                <SliderRow label="Avg retention" value={ltvMonths} min={3} max={60} step={1} format={(v) => `${v} mo`} onChange={(v) => updateAssumption("ltvMonths", v)} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 md:p-5">
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">
                  Gross profit / pt / mo <span className="text-foreground-muted font-normal text-xs ml-2">auto-syncs from economics</span>
                </p>
                <SliderRow label="Base gross profit" value={Math.round(econ.gpPerPt)} min={10} max={150} step={1} format={(v) => fmt(v)} onChange={() => {}} />
              </CardContent>
            </Card>
          </div>

          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">LTV : CAC summary</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">Total CAC</p>
              <p className="font-mono text-base md:text-lg font-medium">{fmt(totalCac)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">{cacItems.length} assumptions · all-in</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">Patient LTV</p>
              <p className="font-mono text-base md:text-lg font-medium text-green">{fmt(cac.ltv)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">{fmt(Math.round(cac.gpWithMeal))}{mealEnabled ? " (+ meals)" : ""} × {ltvMonths} mo</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">LTV : CAC ratio</p>
              <p className={`font-mono text-base md:text-lg font-medium ${cac.ratio >= 5 ? "text-green" : cac.ratio >= 3 ? "text-amber" : "text-destructive"}`}>{cac.ratio.toFixed(1)}×</p>
              <p className="text-[11px] text-foreground-muted mt-1">target ≥ 3×</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-[11px] text-foreground-muted mb-1">Payback period</p>
              <p className={`font-mono text-base md:text-lg font-medium ${cac.payback <= 6 ? "text-green" : cac.payback <= 12 ? "text-foreground" : "text-destructive"}`}>{cac.payback.toFixed(1)} mo</p>
              <p className="text-[11px] text-foreground-muted mt-1">months to recover CAC</p>
            </div>
          </div>

          {/* Ratio bar */}
          <Card className="mb-5">
            <CardContent className="p-4 md:p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[13px] font-medium">LTV : CAC ratio</span>
                <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${cac.ratio >= 5 ? "bg-green-light text-green" : cac.ratio >= 3 ? "bg-amber-light text-amber" : "bg-red-light text-destructive"}`}>
                  {ratioVerdict}
                </span>
              </div>
              <div className="h-[7px] bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((cac.ratio / 10) * 100, 100)}%`,
                    backgroundColor: cac.ratio >= 5 ? "hsl(var(--green))" : cac.ratio >= 3 ? "hsl(var(--amber))" : "hsl(var(--destructive))",
                  }}
                />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-foreground-muted">
                <span>0×</span>
                <span className="text-destructive">1× breakeven</span>
                <span className="text-amber">3× good</span>
                <span className="text-green">5× great</span>
                <span>10×+</span>
              </div>
            </CardContent>
          </Card>

          {/* How each number is built */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">How each number is built</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-foreground-muted mb-2">Total all-in CAC</p>
                <div className="font-mono text-xs text-foreground-muted leading-loose">
                  {Object.entries(cacItems.reduce((acc, i) => { acc[i.cat] = (acc[i.cat] || 0) + i.amt; return acc; }, {} as Record<string, number>))
                    .filter(([, v]) => v > 0)
                    .map(([k, v], i, arr) => (
                      <span key={k}>{i > 0 && "+ "}{fmt(v)} {k.toLowerCase()}{i < arr.length - 1 && <br />}</span>
                    ))}
                </div>
                <p className="font-mono text-lg font-medium mt-2 pt-2 border-t border-border">= {fmt(totalCac)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-foreground-muted mb-2">Patient LTV</p>
                <div className="font-mono text-xs text-foreground-muted leading-loose">
                  {fmt(Math.round(cac.gpWithMeal))}/mo gross profit
                  {mealEnabled && <><br /><span className="text-green text-[11px]">incl. meal margin</span></>}
                  <br />× {ltvMonths} months retained
                </div>
                <p className="font-mono text-lg font-medium mt-2 pt-2 border-t border-border text-green">= {fmt(cac.ltv)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-foreground-muted mb-2">Payback period</p>
                <div className="font-mono text-xs text-foreground-muted leading-loose">
                  {fmt(totalCac)} all-in CAC<br />÷ {fmt(Math.round(cac.gpWithMeal))}/mo profit
                </div>
                <p className="font-mono text-lg font-medium mt-2 pt-2 border-t border-border">= {cac.payback.toFixed(1)} months</p>
              </CardContent>
            </Card>
          </div>

          {/* Benchmarks */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Benchmark</div>
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { label: "Below 1× — losing money per patient", min: 0, max: 1 },
              { label: "1–3× — recovering costs, thin", min: 1, max: 3 },
              { label: "3–5× — healthy, industry standard", min: 3, max: 5 },
              { label: "5–10× — excellent for value-based care", min: 5, max: 10 },
              { label: "10×+ — exceptional unit economics", min: 10, max: 999 },
            ].map((b) => {
              const active = cac.ratio >= b.min && cac.ratio < b.max;
              const cls = active
                ? b.min >= 5 ? "bg-green-light text-green border-green" : b.min >= 3 ? "bg-amber-light text-amber border-amber" : "bg-red-light text-destructive border-destructive"
                : "text-foreground-muted border-border";
              return (
                <span key={b.label} className={`text-xs px-3 py-1 rounded-full border ${cls}`}>{b.label}</span>
              );
            })}
          </div>

          {/* Generate button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate("/cash-flow")} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              <BarChart3 className="w-4 h-4" /> Generate Cash Flow Model
            </button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footnote */}
      <div className="text-xs text-foreground-muted leading-relaxed border-t border-border pt-6">
        <strong className="text-foreground-secondary font-medium">Assumptions:</strong> 160 hrs/month per FTE. 15% burden on labor. HealthArc bundles RPM device monitoring + CCM platform at ${haRate}/pt/mo. RingCentral ${rcRate}/pt/mo. Revenue reflects 2026 Medicare rates: stacked CCM + RPM. Fixed costs (Zivian ~$2,000/mo, EHR ~$650/mo) excluded from variable model. LTV = gross profit × avg retention months. Target: {targetPts} patients initial milestone.
        <br /><br />
        <strong className="text-foreground-secondary font-medium">Built for FareRX MSO · Internal use only</strong>
      </div>
    </>
  );
}
