import { SectionTag } from "@/components/ui/section-tag";
import { KPICard } from "@/components/ui/kpi-card";
import { InfoBox } from "@/components/ui/info-box";
import { BudgetSectionDisplay } from "@/components/BudgetSectionDisplay";
import { BUDGET_DATA, formatCurrency, BURDEN } from "@/lib/budget-data";
import { useCustomCosts } from "@/hooks/use-custom-costs";
import { useCACLTVAssumptions } from "@/hooks/use-cac-ltv-assumptions";
import { AddCostDialog } from "@/components/AddCostDialog";
import { X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const sectionColors: Record<string, string> = {
  onetime: "blue",
  preenroll: "green",
  monthly: "coral",
  milestones: "blue",
};

function fmt2(n: number) { return "$" + n.toFixed(2); }

export default function BudgetOverview() {
  const { onetimeCosts, monthlyCosts, addCost, removeCost } = useCustomCosts();
  const { assumptions: cacA, totalCac: cacPerPt } = useCACLTVAssumptions();
  const cacBudget = cacPerPt * cacA.targetPts;

  // Dynamic loaded costs from shared assumptions
  const rdLoaded = cacA.rdRate * cacA.rdHrs * BURDEN;
  const rnLoaded = cacA.rnRate * cacA.rnHrs * BURDEN;
  const maLoaded = cacA.maRate * cacA.maHrs * BURDEN;
  const haRate = cacA.haRate;
  const rcRate = cacA.rcRate;
  const billingPct = cacA.billingPct;
  const revPt = cacA.revPt;
  const billCost = revPt * (billingPct / 100);
  const totalVarPt = rdLoaded + rnLoaded + maLoaded + haRate + rcRate + billCost;
  const marginPt = revPt - totalVarPt;
  const marginPct = revPt > 0 ? (marginPt / revPt) * 100 : 0;

  // Dynamic clinical costs for 30 patients
  const clinPts = 30;
  const clinicalItems = [
    { label: `RD loaded (${fmt2(rdLoaded)} × ${clinPts} pts)`, lo: Math.round(rdLoaded * clinPts), hi: Math.round(rdLoaded * clinPts) },
    { label: `RN loaded (${fmt2(rnLoaded)} × ${clinPts} pts)`, lo: Math.round(rnLoaded * clinPts), hi: Math.round(rnLoaded * clinPts) },
    { label: `MA loaded (${fmt2(maLoaded)} × ${clinPts} pts)`, lo: Math.round(maLoaded * clinPts), hi: Math.round(maLoaded * clinPts) },
    { label: `HealthArc ($${haRate} × ${clinPts} pts)`, lo: haRate * clinPts, hi: haRate * clinPts },
    { label: `RingCentral ($${rcRate} × ${clinPts} pts)`, lo: rcRate * clinPts, hi: rcRate * clinPts },
    { label: `Billing & coding (${billingPct}% of ~$${Math.round(revPt * clinPts / 1000)}K)`, lo: Math.round(billCost * clinPts), hi: Math.round(billCost * clinPts) },
    { label: "Prior auth (optional)", lo: 0, hi: 260 },
  ];

  // Merge BUDGET_DATA monthly with dynamic clinical items
  const monthlySection = {
    ...BUDGET_DATA.monthly,
    items: [...BUDGET_DATA.monthly.items, ...clinicalItems],
  };

  const ot = BUDGET_DATA.onetime;
  const pe = BUDGET_DATA.preenroll;
  const mo = monthlySection;
  const ml = BUDGET_DATA.milestones;

  const oL = ot.items.reduce((a, i) => a + i.lo, 0) + onetimeCosts.reduce((a, c) => a + c.lo, 0);
  const oH = ot.items.reduce((a, i) => a + i.hi, 0) + onetimeCosts.reduce((a, c) => a + c.hi, 0);
  const pL = pe.items.reduce((a, i) => a + i.lo, 0);
  const pH = pe.items.reduce((a, i) => a + i.hi, 0);
  const mL = mo.items.reduce((a, i) => a + i.lo, 0) + monthlyCosts.reduce((a, c) => a + c.lo, 0);
  const mH = mo.items.reduce((a, i) => a + i.hi, 0) + monthlyCosts.reduce((a, c) => a + c.hi, 0);
  const mlL = ml.items.reduce((a, i) => a + i.lo, 0);
  const mlH = ml.items.reduce((a, i) => a + i.hi, 0);
  const gL = oL + pL + mL * 3 + mlL + cacBudget;
  const gH = oH + pH + mH * 3 + mlH + cacBudget;

  const chartData = [
    { name: "Upfront", lo: oL, hi: oH },
    { name: "Pre-enroll", lo: pL, hi: pH },
    { name: "3mo burn", lo: mL * 3, hi: mH * 3 },
    { name: "Milestones", lo: mlL, hi: mlH },
    { name: "CAC acq.", lo: cacBudget, hi: cacBudget },
    { name: "Total", lo: gL, hi: gH },
  ];

  // Build display sections — override monthly to show dynamic items
  const displaySections: Record<string, typeof BUDGET_DATA[string]> = {
    onetime: BUDGET_DATA.onetime,
    preenroll: BUDGET_DATA.preenroll,
    monthly: monthlySection,
    milestones: BUDGET_DATA.milestones,
  };

  return (
    <>
      <SectionTag color="purple">Confidential — FareRX + Greens Health</SectionTag>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Startup budget — variable cost model</h1>
      <p className="text-xs text-foreground-secondary mb-5 max-w-[720px] leading-relaxed">
        PC + MSO + Non-Profit for CCM/RPM/MNT in PA. All clinical costs are variable per patient with 15% payroll burden loaded. HealthArc ${haRate}/pt and RingCentral ${rcRate}/pt scale with volume. Launch April 2026 with 10 MNT patients. CCM/RPM cash arrives after 90-day delay then monthly. Capital range $40K–$60K.
      </p>

      <div data-tour="kpi-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
        <KPICard color="purple" label="Total capital" value={`${formatCurrency(gL)} – ${formatCurrency(gH)}`} subtitle="Through month 3 + milestones" />
        <KPICard color="coral" label="Monthly burn (30 pts)" value={`${formatCurrency(mL)} – ${formatCurrency(mH)}`} subtitle="Clinical variable + platform" />
        <KPICard color="green" label="Margin per patient" value={fmt2(marginPt)} subtitle={`${marginPct.toFixed(0)}% on CCM+RPM ($${revPt})`} />
      </div>

      <InfoBox variant="emphasis" title={`Clinical variable costs per patient (with 15% payroll burden)`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mt-1.5">
          <span><strong>RD (Dietitian)</strong><br />${cacA.rdRate}/hr × {cacA.rdHrs} hrs<br />= {fmt2(cacA.rdRate * cacA.rdHrs)} → loaded <strong>{fmt2(rdLoaded)}</strong></span>
          <span><strong>RN (Nurse)</strong><br />${cacA.rnRate}/hr × {cacA.rnHrs} hrs<br />= {fmt2(cacA.rnRate * cacA.rnHrs)} → loaded <strong>{fmt2(rnLoaded)}</strong></span>
          <span><strong>MA</strong><br />${cacA.maRate}/hr × {cacA.maHrs} hrs<br />= {fmt2(cacA.maRate * cacA.maHrs)} → loaded <strong>{fmt2(maLoaded)}</strong></span>
          <span><strong>Platforms</strong><br />HealthArc <strong>${haRate}/pt</strong><br />RingCentral <strong>${rcRate}/pt</strong></span>
        </div>
        <p className="mt-2"><strong>Billing & coding: {billingPct}%</strong> of collections. Total variable: <strong>{fmt2(totalVarPt)}/pt/mo.</strong> Margin on CCM+RPM (${revPt}): <strong>{fmt2(marginPt)}/pt ({marginPct.toFixed(1)}%)</strong></p>
      </InfoBox>

      <div data-tour="budget-sections">
        {Object.entries(displaySections).map(([key, section]) => (
          <BudgetSectionDisplay key={key} section={section} colorClass={sectionColors[key]} />
        ))}
      </div>

      {/* Custom costs section */}
      {(onetimeCosts.length > 0 || monthlyCosts.length > 0) && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-sm bg-amber" />
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground-secondary">
              Custom costs
            </div>
          </div>
          {onetimeCosts.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_80px_80px_auto] items-center py-1.5 border-b border-border">
              <div className="text-[11px]">{c.name} <span className="text-foreground-muted">(one-time)</span></div>
              <div className="font-mono text-[10px] text-right pr-2 text-foreground-secondary">{formatCurrency(c.lo)}</div>
              <div className="font-mono text-[10px] text-right pr-2 font-medium">{formatCurrency(c.hi)}</div>
              <button onClick={() => removeCost(c.id)} className="ml-1 p-0.5 rounded hover:bg-red-light text-foreground-muted hover:text-red transition-colors"><X className="w-3 h-3" /></button>
            </div>
          ))}
          {monthlyCosts.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_80px_80px_auto] items-center py-1.5 border-b border-border">
              <div className="text-[11px]">{c.name} <span className="text-foreground-muted">(monthly)</span></div>
              <div className="font-mono text-[10px] text-right pr-2 text-foreground-secondary">{formatCurrency(c.lo)}</div>
              <div className="font-mono text-[10px] text-right pr-2 font-medium">{formatCurrency(c.hi)}</div>
              <button onClick={() => removeCost(c.id)} className="ml-1 p-0.5 rounded hover:bg-red-light text-foreground-muted hover:text-red transition-colors"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-5">
        <AddCostDialog onAdd={addCost} />
      </div>

      <div className="h-px bg-border my-4" />

      {/* Total capital section */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-sm bg-purple" />
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground-secondary">
            Total capital through month 3
          </div>
        </div>
        {[
          { label: "Upfront (immediate)", lo: oL, hi: oH },
          { label: "Pre-enrollment", lo: pL, hi: pH },
          { label: "3 months recurring", lo: mL * 3, hi: mH * 3 },
          { label: "Milestone bonuses (4×$2K)", lo: mlL, hi: mlH },
          { label: `CAC acquisition (${cacA.targetPts} pts × ${formatCurrency(cacPerPt)})`, lo: cacBudget, hi: cacBudget },
        ].map((item) => (
          <div key={item.label} className="grid grid-cols-[1fr_80px_80px_1fr] items-center py-1.5 border-b border-border">
            <div className="text-[11px]">{item.label}</div>
            <div className="font-mono text-[10px] text-right pr-2 text-foreground-secondary">{formatCurrency(item.lo)}</div>
            <div className="font-mono text-[10px] text-right pr-2 font-medium">{formatCurrency(item.hi)}</div>
            <div />
          </div>
        ))}
        <div className="grid grid-cols-[1fr_80px_80px_1fr] items-center p-2 mt-1 rounded-md bg-purple-light">
          <div className="text-[11px] font-semibold text-purple">Total capital needed</div>
          <div className="font-mono text-[10px] text-right pr-2 font-medium text-foreground-secondary">{formatCurrency(gL)}</div>
          <div className="font-mono text-[13px] text-right pr-2 font-bold text-purple">{formatCurrency(gH)}</div>
          <div />
        </div>
      </div>

      {/* Chart */}
      <div data-tour="budget-chart" className="bg-card rounded-lg p-3 mb-1">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 0% / 0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "hsl(48 4% 56%)", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(48 4% 56%)", fontSize: 8, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}K`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="lo" name="Low" fill="rgba(37,99,235,0.55)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="hi" name="High" fill="rgba(37,99,235,0.18)" stroke="rgba(37,99,235,0.3)" strokeWidth={1} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-2.5 text-[9px] text-foreground-muted mb-3.5">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(37,99,235,0.6)" }} />Low</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(37,99,235,0.18)" }} />High</span>
      </div>

      <InfoBox variant="success" title={`${marginPct.toFixed(0)}% gross margin per patient`}>
        At {fmt2(marginPt)}/pt margin on CCM+RPM, you need only <strong>~{Math.ceil(cacA.fixedCost / marginPt)} patients</strong> to cover the fixed platform costs (Zivian $2,000 + EHR $650 = ${formatCurrency(cacA.fixedCost)}/mo). With MNT revenue on top (~$1,360/mo at 10 pts), break-even drops further.
      </InfoBox>
      <InfoBox variant="question" title="Revenue timeline (April start)">
        <strong>Apr (Mo 1):</strong> MNT + CCM + RPM billing starts. <strong>May (Mo 2):</strong> MNT cash arrives (~30d). <strong>Jul (Mo 4):</strong> CCM/RPM cash arrives (90d delay), then monthly thereafter. Variable clinical costs only incurred on active patients — no empty FTE burn.
      </InfoBox>

      <div className="mt-8 pt-3 border-t border-border flex justify-between text-[9px] text-foreground-muted">
        <span>April 2026 — Kehlin Swain, Greens Health</span>
        <span>kehlin.swain@greens.health</span>
      </div>
    </>
  );
}
