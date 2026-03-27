import { SectionTag } from "@/components/ui/section-tag";
import { KPICard } from "@/components/ui/kpi-card";
import { InfoBox } from "@/components/ui/info-box";
import { BudgetSectionDisplay } from "@/components/BudgetSectionDisplay";
import { BUDGET_DATA, formatCurrency } from "@/lib/budget-data";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const sectionColors: Record<string, string> = {
  onetime: "blue",
  preenroll: "green",
  monthly: "coral",
};

export default function BudgetOverview() {
  const ot = BUDGET_DATA.onetime;
  const pe = BUDGET_DATA.preenroll;
  const mo = BUDGET_DATA.monthly;

  const oL = ot.items.reduce((a, i) => a + i.lo, 0);
  const oH = ot.items.reduce((a, i) => a + i.hi, 0);
  const pL = pe.items.reduce((a, i) => a + i.lo, 0);
  const pH = pe.items.reduce((a, i) => a + i.hi, 0);
  const mL = mo.items.reduce((a, i) => a + i.lo, 0);
  const mH = mo.items.reduce((a, i) => a + i.hi, 0);
  const gL = oL + pL + mL * 3;
  const gH = oH + pH + mH * 3;

  const chartData = [
    { name: "Upfront", lo: oL, hi: oH },
    { name: "Pre-enroll", lo: pL, hi: pH },
    { name: "3mo burn", lo: mL * 3, hi: mH * 3 },
    { name: "Total", lo: gL, hi: gH },
  ];

  return (
    <>
      <SectionTag color="purple">Confidential — FareRX + Greens Health</SectionTag>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Startup budget — variable cost model</h1>
      <p className="text-xs text-foreground-secondary mb-5 max-w-[720px] leading-relaxed">
        PC + MSO + Non-Profit for CCM/RPM/MNT in PA. All clinical costs are variable per patient with 15% payroll burden loaded. RPM tech and billing/coding scale with volume. All programs launch Month 1. MNT cash Month 2, CCM/RPM cash Month 4.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
        <KPICard color="purple" label="Total capital" value={`${formatCurrency(gL)} – ${formatCurrency(gH)}`} subtitle="Through month 3" />
        <KPICard color="coral" label="Monthly burn (30 pts)" value={`${formatCurrency(mL)} – ${formatCurrency(mH)}`} subtitle="Clinical variable + platform" />
        <KPICard color="green" label="Margin per patient" value="$51.62" subtitle="31% on CCM+RPM ($166)" />
      </div>

      <InfoBox variant="emphasis" title="Clinical variable costs per patient (with 15% payroll burden)">
        <div className="grid grid-cols-4 gap-1.5 mt-1.5">
          <span><strong>RD (Dietitian)</strong><br />$40/hr × 0.75 hrs<br />= $30.00 → loaded <strong>$34.50</strong></span>
          <span><strong>RN (Nurse)</strong><br />$45/hr × 0.50 hrs<br />= $22.50 → loaded <strong>$25.88</strong></span>
          <span><strong>MA</strong><br />$24/hr × 0.75 hrs<br />= $18.00 → loaded <strong>$20.70</strong></span>
          <span><strong>RPM Tech</strong><br />Flat per patient<br /><strong>$25.83/pt/mo</strong></span>
        </div>
        <p className="mt-2"><strong>Billing & coding: 4.5%</strong> of collections. Total variable: <strong>$106.91 + 4.5% = ~$114.38/pt/mo.</strong> Margin on CCM+RPM ($166): <strong>$51.62/pt (31.1%)</strong></p>
      </InfoBox>

      {Object.entries(BUDGET_DATA).map(([key, section]) => (
        <BudgetSectionDisplay key={key} section={section} colorClass={sectionColors[key]} />
      ))}

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
      <div className="bg-card rounded-lg p-3 mb-1">
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

      <InfoBox variant="success" title="31% gross margin per patient">
        At $51.62/pt margin on CCM+RPM, you need only <strong>~20 patients</strong> to cover the fixed platform costs (Zivian $2,000 + EHR $650 = $2,650/mo). With MNT revenue on top (~$2,040/mo at 15 pts), break-even drops to <strong>~12 CCM/RPM patients</strong>. This is a much stronger unit economics story than fixed staffing models.
      </InfoBox>
      <InfoBox variant="question" title="Revenue timeline">
        <strong>Mo 1:</strong> MNT + CCM + RPM billing starts. <strong>Mo 2:</strong> MNT cash arrives (~30d). <strong>Mo 4:</strong> CCM/RPM cash arrives (~90d). Variable clinical costs only incurred on active patients — no empty FTE burn.
      </InfoBox>

      <div className="mt-8 pt-3 border-t border-border flex justify-between text-[9px] text-foreground-muted">
        <span>March 2026 — Kehlin Swain, Greens Health</span>
        <span>kehlin.swain@greens.health</span>
      </div>
    </>
  );
}
