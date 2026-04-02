import { useMemo } from "react";
import { SectionTag } from "@/components/ui/section-tag";
import { KPICard } from "@/components/ui/kpi-card";
import { InfoBox } from "@/components/ui/info-box";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/budget-data";
import { useCACLTVAssumptions } from "@/hooks/use-cac-ltv-assumptions";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart,
} from "recharts";

const BURDEN = 1.15;
const AVAIL = 160;

function fmt(n: number) { return "$" + Math.round(n).toLocaleString("en-US"); }
function fmt2(n: number) { return "$" + n.toFixed(2); }

interface SliderRowProps {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}
function SliderRow({ label, value, min, max, step, format, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3 mb-3 last:mb-0">
      <span className="text-xs text-foreground-muted w-[120px] shrink-0">{label}</span>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="flex-1" />
      <span className="font-mono text-xs font-medium text-foreground w-[72px] text-right shrink-0">{format(value)}</span>
    </div>
  );
}

export default function CACtoLTV() {
  const { assumptions: a, updateAssumption, loaded } = useCACLTVAssumptions();

  const patients = a.patients;
  const rdRate = a.rdRate, rnRate = a.rnRate, maRate = a.maRate;
  const haRate = a.haRate, rcRate = a.rcRate;
  const rdHrs = a.rdHrs, rnHrs = a.rnHrs, maHrs = a.maHrs;
  const billingPct = a.billingPct, revPt = a.revPt;
  const cacDevice = a.cacDevice, cacMktg = a.cacMktg, cacOnboard = a.cacOnboard;
  const ltvMonths = a.ltvMonths;
  const targetPts = a.targetPts, rampMo = a.rampMo, fixedCost = a.fixedCost;

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

  const cac = useMemo(() => {
    const totalCac = cacDevice + cacMktg + cacOnboard;
    const gpPt = Math.max(econ.gpPerPt, 1);
    const ltv = gpPt * ltvMonths;
    const ratio = totalCac > 0 ? ltv / totalCac : 0;
    const payback = gpPt > 0 ? totalCac / gpPt : 99;
    return { totalCac, ltv, ratio, payback, gpPt };
  }, [cacDevice, cacMktg, cacOnboard, ltvMonths, econ.gpPerPt]);

  const budget = useMemo(() => {
    const cacPt = cac.totalCac;
    const totalCacBudget = cacPt * targetPts;
    const gpFull = (revPt - econ.tv) * targetPts - fixedCost;
    const pb = gpFull > 0 ? totalCacBudget / gpFull : 99;
    const totMo = Math.max(rampMo + 8, 12);
    const rows: any[] = [];
    let cum = 0;
    let be: number | null = null;
    for (let m = 1; m <= totMo; m++) {
      const p = m <= rampMo ? Math.round((m / rampMo) * targetPts) : targetPts;
      const pp = m > 1 && m <= rampMo ? Math.round(((m - 1) / rampMo) * targetPts) : m === 1 ? 0 : targetPts;
      const np = m <= rampMo ? p - pp : 0;
      const mR = revPt * p;
      const mV = econ.tv * p;
      const mC = cacPt * np;
      const mN = mR - mV - fixedCost - mC;
      cum += mN;
      if (cum >= 0 && !be) be = m;
      rows.push({ m, p, mR, mV, fx: fixedCost, mC, mN, cum });
    }
    const fullMonths = Math.max(0, 12 - rampMo);
    const rampGp = rows.slice(0, rampMo).reduce((a, r) => a + r.mN, 0);
    const yr1 = rampGp + (gpFull * fullMonths);
    return { totalCacBudget, gpFull, pb, rows, be, yr1, cacPt };
  }, [targetPts, rampMo, fixedCost, cac.totalCac, revPt, econ.tv]);

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

  // Ratio verdict
  const ratioVerdict = cac.ratio >= 5 ? "Excellent" : cac.ratio >= 3 ? "Good" : cac.ratio >= 1 ? "Developing" : "Below breakeven";
  const ratioColor = cac.ratio >= 5 ? "text-green" : cac.ratio >= 3 ? "text-amber" : "text-destructive";

  // Chart data for ramp
  const chartData = budget.rows.slice(0, 12).map((r) => ({
    name: `Mo ${r.m}`,
    revenue: r.mR,
    cost: -(r.mV + r.fx + r.mC),
    cumulative: r.cum,
  }));

  return (
    <>
      <SectionTag color="green">CAC to LTV — Patient Unit Economics</SectionTag>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Patient Economics Calculator</h1>
      <p className="text-xs text-foreground-secondary mb-5 max-w-[720px] leading-relaxed">
        CCM + RPM · HealthArc $16/pt · RingCentral $4/pt · 2026 Medicare rates. Target: {targetPts} patients initial milestone.
      </p>

      {/* Global patient slider */}
      <Card className="mb-5" data-tour="cac-patients">
        <CardContent className="flex flex-wrap items-center gap-5 p-5">
          <div className="min-w-[120px]">
            <p className="text-sm font-medium text-foreground">Active patients</p>
            <p className="text-xs text-foreground-muted">Drives all sections</p>
          </div>
          <Slider value={[patients]} min={10} max={300} step={5} onValueChange={([v]) => ((v: number) => updateAssumption("patients", v))(v)} className="flex-[2] min-w-[160px]" />
          <span className="font-mono text-3xl font-medium text-foreground min-w-[52px] text-right">{patients}</span>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="mb-8">
        <TabsList className="w-full justify-start mb-6">
          <TabsTrigger value="summary">Executive Summary</TabsTrigger>
          <TabsTrigger value="budget">Acquisition Budget</TabsTrigger>
          <TabsTrigger value="economics">Economics Model</TabsTrigger>
          <TabsTrigger value="ltv">CAC & LTV</TabsTrigger>
        </TabsList>

        {/* ═══ EXECUTIVE SUMMARY ═══ */}
        <TabsContent value="summary">
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
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">Total CAC budget</p>
              <p className="font-mono text-lg font-medium">{fmt(budget.totalCacBudget)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">{fmt(budget.cacPt)}/pt one-time</p>
            </div>
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">Monthly profit at full panel</p>
              <p className={`font-mono text-lg font-medium ${budget.gpFull >= 0 ? "text-green" : "text-destructive"}`}>{fmt(budget.gpFull)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">after {fmt(fixedCost)} fixed costs</p>
            </div>
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">CAC payback</p>
              <p className={`font-mono text-lg font-medium ${budget.pb <= 6 ? "text-green" : budget.pb <= 12 ? "text-foreground" : "text-destructive"}`}>{budget.pb < 50 ? `${budget.pb.toFixed(1)} mo` : "N/A"}</p>
              <p className="text-[11px] text-foreground-muted mt-1">after full ramp</p>
            </div>
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">Year-1 gross profit est.</p>
              <p className={`font-mono text-lg font-medium ${budget.yr1 > 0 ? "text-green" : "text-destructive"}`}>{fmt(Math.max(budget.yr1, 0))}</p>
              <p className="text-[11px] text-foreground-muted mt-1">ramp + {Math.max(0, 12 - rampMo)} full months</p>
            </div>
          </div>

          {/* Insights */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Dynamic insights</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <InfoBox variant={econ.margin >= 0.35 ? "success" : econ.margin < 0.25 ? "warning" : "note"} title={`Gross margin at ${(econ.margin * 100).toFixed(1)}%`}>
              Variable cost is {fmt2(econ.tv)}/pt against {fmt2(revPt)}/pt revenue. Gross profit is {fmt2(econ.gpPerPt)}/pt.
            </InfoBox>
            <InfoBox variant={patients < minMax * 0.7 ? "success" : patients >= minMax ? "warning" : "note"} title={patients < minMax ? `One crew scales to ${minMax} patients` : `${bottleneck.label} at capacity`}>
              {patients < minMax
                ? `At ${patients} patients your team is at ${Math.round((patients / minMax) * 100)}% of capacity. Scale to ${minMax} before adding staff.`
                : `At ${patients} patients your ${bottleneck.label} is over the 160 hr/mo limit. Add a part-time resource.`}
            </InfoBox>
            <InfoBox variant={cac.ratio >= 5 ? "success" : cac.ratio < 3 ? "warning" : "note"} title={`LTV:CAC of ${cac.ratio.toFixed(1)}× — ${ratioVerdict}`}>
              Every $1 of CAC returns ${cac.ratio.toFixed(1)} in lifetime gross profit. At {fmt(cac.totalCac)} CAC, payback is {cac.payback.toFixed(1)} months.
            </InfoBox>
            <InfoBox variant={budget.be && budget.be <= 6 ? "success" : budget.be && budget.be > 9 ? "warning" : "note"} title={budget.be ? `Cash positive by month ${budget.be}` : "No breakeven in 12 months"}>
              {budget.be
                ? budget.be <= 6
                  ? "Sub-6-month cumulative breakeven is strong. Physician referral acquisition keeps CAC low."
                  : `Pulling the ramp from ${rampMo} to ${Math.max(1, rampMo - 1)} months is the single biggest lever to shorten it.`
                : "Check fixed costs, variable cost, and ramp speed. Margin may be too thin at this panel size."}
            </InfoBox>
          </div>

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
        </TabsContent>

        {/* ═══ ACQUISITION BUDGET ═══ */}
        <TabsContent value="budget">
          <h2 className="text-lg font-medium mb-1">Patient acquisition budget</h2>
          <p className="text-xs text-foreground-muted mb-5 max-w-[640px] leading-relaxed">
            What does it cost to get to your target panel, and when does cumulative cash turn positive?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <Card>
              <CardContent className="p-5">
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">Acquisition targets</p>
                <SliderRow label="Target patients" value={targetPts} min={25} max={300} step={5} format={(v) => `${v} pts`} onChange={((v: number) => updateAssumption("targetPts", v))} />
                <SliderRow label="Ramp (months)" value={rampMo} min={1} max={12} step={1} format={(v) => `${v} mo`} onChange={((v: number) => updateAssumption("rampMo", v))} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">Cost basis</p>
                <SliderRow label="Fixed cost / mo" value={fixedCost} min={1000} max={10000} step={250} format={(v) => fmt(v)} onChange={((v: number) => updateAssumption("fixedCost", v))} />
                <SliderRow label="Variable cost / pt" value={Math.round(econ.tv)} min={60} max={160} step={1} format={(v) => fmt(v)} onChange={() => {}} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
            <KPICard color="blue" label="Total CAC budget" value={fmt(budget.totalCacBudget)} subtitle={`${fmt(budget.cacPt)} × ${targetPts} pts`} />
            <KPICard color={budget.gpFull >= 0 ? "green" : "coral"} label="Monthly profit at full panel" value={fmt(budget.gpFull)} subtitle="after fixed costs" />
            <KPICard color={budget.pb <= 6 ? "green" : "blue"} label="CAC payback" value={budget.pb < 50 ? `${budget.pb.toFixed(1)} mo` : "N/A"} subtitle="after full ramp" />
            <KPICard color={budget.be && budget.be <= 6 ? "green" : "blue"} label="Cumulative breakeven" value={budget.be ? `Mo ${budget.be}` : "N/A"} subtitle="first positive month" />
          </div>

          {/* Budget breakdown table */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.04em] text-foreground-secondary mb-2">Acquisition budget breakdown</div>
          <div className="overflow-x-auto mb-5">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-foreground-muted text-[9px] font-semibold uppercase tracking-wider">Line item</th>
                  <th className="text-right p-2 text-foreground-muted text-[9px] font-semibold uppercase tracking-wider">Per patient</th>
                  <th className="text-right p-2 text-foreground-muted text-[9px] font-semibold uppercase tracking-wider">× panel</th>
                  <th className="text-right p-2 text-foreground-muted text-[9px] font-semibold uppercase tracking-wider">Total budget</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "RPM devices", sub: "One-time per patient — hardware cost", pp: cacDevice, tot: cacDevice * targetPts },
                  { label: "Marketing & outreach", sub: "Physician referral, community outreach", pp: cacMktg, tot: cacMktg * targetPts },
                  { label: "Onboarding labor", sub: "Staff time for intake, enrollment, setup", pp: cacOnboard, tot: cacOnboard * targetPts },
                  { label: "Total acquisition budget", sub: "", pp: budget.cacPt, tot: budget.totalCacBudget, bold: true },
                ].map((r) => (
                  <tr key={r.label} className={`border-b border-border ${r.bold ? "bg-muted font-medium" : ""}`}>
                    <td className="p-2">
                      <div className={r.bold ? "font-semibold" : ""}>{r.label}</div>
                      {r.sub && <div className="text-foreground-muted text-[10px]">{r.sub}</div>}
                    </td>
                    <td className="text-right font-mono p-2">{fmt(r.pp)}</td>
                    <td className="text-right text-foreground-muted p-2">× {targetPts}</td>
                    <td className="text-right font-mono font-medium p-2">{fmt(r.tot)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ramp chart */}
          <div className="text-[9px] font-semibold uppercase tracking-[0.04em] text-foreground-secondary mb-2">Month-by-month ramp & cash flow</div>
          <div className="bg-card rounded-lg p-3 mb-3">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 0% / 0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(48 4% 56%)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(48 4% 56%)", fontSize: 8, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v < 0 ? "-$" : "$"}${Math.abs(Math.round(v / 1000))}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="revenue" name="Revenue" fill="rgba(29,158,117,0.35)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cost" name="Total cost" fill="rgba(186,117,23,0.25)" radius={[3, 3, 0, 0]} />
                <Line dataKey="cumulative" name="Cumulative cash" type="monotone" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Ramp table */}
          <div className="overflow-x-auto mb-5 -mx-4 px-4 pb-6 md:mx-0 md:px-0 md:pb-0 scrollbar-thin">
            <table className="w-full border-collapse text-[9px]" style={{ minWidth: 680 }}>
              <thead>
                <tr className="border-b border-border">
                  {["Month", "Patients", "Revenue", "Variable", "Fixed", "CAC spend", "Net cash", "Cumulative"].map((h) => (
                    <th key={h} className={`p-1.5 text-[8px] font-semibold uppercase tracking-wider text-foreground-muted ${h !== "Month" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budget.rows.slice(0, 12).map((r) => (
                  <tr key={r.m} className={`border-b border-border ${r.m === budget.be ? "bg-green-light/30" : ""}`}>
                    <td className="p-1.5 text-foreground-muted">{r.m === budget.be ? "✓ " : ""}Month {r.m}</td>
                    <td className="text-right font-mono p-1.5">{r.p}</td>
                    <td className="text-right font-mono p-1.5">{fmt(r.mR)}</td>
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
            At <strong>{targetPts} patients</strong> and a <strong>{rampMo}-month ramp</strong>, total acquisition budget is <strong>{fmt(budget.totalCacBudget)}</strong>. Monthly profit at full panel is <strong>{fmt(budget.gpFull)}</strong> after {fmt(fixedCost)} fixed costs. Cumulative breakeven in <strong>{budget.be ? `month ${budget.be}` : "beyond month 12"}</strong>.
          </InfoBox>
        </TabsContent>

        {/* ═══ ECONOMICS MODEL ═══ */}
        <TabsContent value="economics">
          <InfoBox variant="success" title="Lemonade stand version">
            Each patient pays you ${revPt}/month. You pay workers to serve them. Whatever is left is gross profit. The goal: add more patients using the same crew before needing to hire.
          </InfoBox>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">Revenue</p>
              <p className="font-mono text-lg font-medium">{fmt(econ.tRev)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">{fmt2(revPt)} × {patients} pts</p>
            </div>
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">Variable cost</p>
              <p className="font-mono text-lg font-medium">{fmt(econ.tCost)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">{fmt2(econ.tv)} × {patients} pts</p>
            </div>
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">Gross profit</p>
              <p className={`font-mono text-lg font-medium ${econ.profit >= 0 ? "text-green" : "text-destructive"}`}>{fmt(econ.profit)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">before fixed costs</p>
            </div>
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">Gross margin</p>
              <p className={`font-mono text-lg font-medium ${econ.margin >= 0.25 ? "text-green" : "text-destructive"}`}>{(econ.margin * 100).toFixed(1)}%</p>
              <p className="text-[11px] text-foreground-muted mt-1">target ≥ 25%</p>
            </div>
          </div>

          <h3 className="text-sm font-medium mb-1">Staff & platform assumptions</h3>
          <p className="text-xs text-foreground-muted mb-4">15% burden on labor. HealthArc and RingCentral are flat platform rates — no burden applied.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <Card>
              <CardContent className="p-5">
                <div className="flex gap-2 mb-3">
                  <span className="text-[11px] font-medium bg-green-light text-green-dark px-2.5 py-0.5 rounded-full">HealthArc ${haRate}/pt</span>
                  <span className="text-[11px] font-medium bg-blue-light text-blue px-2.5 py-0.5 rounded-full">RingCentral ${rcRate}/pt</span>
                </div>
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">Hourly rates</p>
                <SliderRow label="RD rate" value={rdRate} min={25} max={70} step={1} format={(v) => `$${v}/hr`} onChange={((v: number) => updateAssumption("rdRate", v))} />
                <SliderRow label="RN rate" value={rnRate} min={30} max={80} step={1} format={(v) => `$${v}/hr`} onChange={((v: number) => updateAssumption("rnRate", v))} />
                <SliderRow label="MA rate" value={maRate} min={15} max={40} step={1} format={(v) => `$${v}/hr`} onChange={((v: number) => updateAssumption("maRate", v))} />
                <SliderRow label="HealthArc" value={haRate} min={8} max={40} step={1} format={(v) => `$${v}/pt`} onChange={((v: number) => updateAssumption("haRate", v))} />
                <SliderRow label="RingCentral" value={rcRate} min={0} max={15} step={1} format={(v) => `$${v}/pt`} onChange={((v: number) => updateAssumption("rcRate", v))} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">
                  Time per patient / month <span className="text-foreground-muted font-normal text-xs ml-2">CCM min = 20 min</span>
                </p>
                <SliderRow label="RD time" value={rdHrs} min={0.1} max={2} step={0.05} format={(v) => `${v.toFixed(2)} hr`} onChange={((v: number) => updateAssumption("rdHrs", v))} />
                <SliderRow label="RN time" value={rnHrs} min={0.1} max={2} step={0.05} format={(v) => `${v.toFixed(2)} hr`} onChange={((v: number) => updateAssumption("rnHrs", v))} />
                <SliderRow label="MA time" value={maHrs} min={0.1} max={2} step={0.05} format={(v) => `${v.toFixed(2)} hr`} onChange={((v: number) => updateAssumption("maHrs", v))} />
                <SliderRow label="Billing %" value={billingPct} min={2} max={8} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={((v: number) => updateAssumption("billingPct", v))} />
              </CardContent>
            </Card>
          </div>

          <Card className="mb-5">
            <CardContent className="flex flex-wrap items-center gap-5 p-5">
              <div className="min-w-[160px]">
                <p className="text-[13px] font-medium">Revenue per patient / month</p>
                <p className="text-xs text-foreground-muted">Stacked CCM + RPM · 2026 Medicare rates</p>
              </div>
              <Slider value={[revPt]} min={100} max={250} step={1} onValueChange={([v]) => ((v: number) => updateAssumption("revPt", v))(v)} className="flex-1 min-w-[120px]" />
              <span className="font-mono text-xl font-medium text-green min-w-[80px] text-right">${revPt}</span>
            </CardContent>
          </Card>

          {/* Cost table */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full border-collapse text-[11px]">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <Card>
              <CardContent className="p-5">
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">
                  CAC components <span className="text-foreground-muted font-normal text-xs ml-2">one-time, per new patient</span>
                </p>
                <SliderRow label="RPM device" value={cacDevice} min={0} max={300} step={5} format={(v) => fmt(v)} onChange={((v: number) => updateAssumption("cacDevice", v))} />
                <SliderRow label="Marketing / outreach" value={cacMktg} min={0} max={200} step={5} format={(v) => fmt(v)} onChange={((v: number) => updateAssumption("cacMktg", v))} />
                <SliderRow label="Onboarding labor" value={cacOnboard} min={0} max={100} step={5} format={(v) => fmt(v)} onChange={((v: number) => updateAssumption("cacOnboard", v))} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-[13px] font-medium pb-3 border-b border-border mb-4">LTV inputs</p>
                <SliderRow label="Avg retention" value={ltvMonths} min={3} max={60} step={1} format={(v) => `${v} mo`} onChange={((v: number) => updateAssumption("ltvMonths", v))} />
                <SliderRow label="Gross profit/pt/mo" value={Math.round(econ.gpPerPt)} min={10} max={120} step={1} format={(v) => fmt(v)} onChange={() => {}} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">Total CAC</p>
              <p className="font-mono text-lg font-medium">{fmt(cac.totalCac)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">one-time per patient</p>
            </div>
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">Patient LTV</p>
              <p className="font-mono text-lg font-medium text-green">{fmt(cac.ltv)}</p>
              <p className="text-[11px] text-foreground-muted mt-1">{fmt(Math.round(econ.gpPerPt))} × {ltvMonths} mo</p>
            </div>
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">LTV : CAC ratio</p>
              <p className={`font-mono text-lg font-medium ${ratioColor}`}>{cac.ratio.toFixed(1)}×</p>
              <p className="text-[11px] text-foreground-muted mt-1">target ≥ 3×</p>
            </div>
            <div className="bg-muted rounded-lg p-3.5">
              <p className="text-[11px] text-foreground-muted mb-1">Payback period</p>
              <p className={`font-mono text-lg font-medium ${cac.payback <= 6 ? "text-green" : cac.payback <= 12 ? "text-foreground" : "text-destructive"}`}>{cac.payback.toFixed(1)} mo</p>
              <p className="text-[11px] text-foreground-muted mt-1">months to recover CAC</p>
            </div>
          </div>

          {/* Ratio bar */}
          <Card className="mb-5">
            <CardContent className="p-5">
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
                <p className="text-[11px] text-foreground-muted mb-2">Total CAC</p>
                <div className="font-mono text-xs text-foreground-muted leading-loose">
                  {fmt(cacDevice)} device<br />+ {fmt(cacMktg)} marketing<br />+ {fmt(cacOnboard)} onboarding
                </div>
                <p className="font-mono text-lg font-medium mt-2 pt-2 border-t border-border">= {fmt(cac.totalCac)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-foreground-muted mb-2">Patient LTV</p>
                <div className="font-mono text-xs text-foreground-muted leading-loose">
                  {fmt(Math.round(econ.gpPerPt))}/mo gross profit<br />× {ltvMonths} months retained
                </div>
                <p className="font-mono text-lg font-medium mt-2 pt-2 border-t border-border text-green">= {fmt(cac.ltv)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-foreground-muted mb-2">Payback period</p>
                <div className="font-mono text-xs text-foreground-muted leading-loose">
                  {fmt(cac.totalCac)} CAC<br />÷ {fmt(Math.round(econ.gpPerPt))}/mo profit
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
