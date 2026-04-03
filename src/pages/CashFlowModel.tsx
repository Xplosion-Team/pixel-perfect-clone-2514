import { useState, useMemo } from "react";
import { SectionTag } from "@/components/ui/section-tag";
import { KPICard } from "@/components/ui/kpi-card";
import { InfoBox } from "@/components/ui/info-box";
import { formatCurrency, clinicalCost, ZIVIAN } from "@/lib/budget-data";
import { exportCashFlow } from "@/lib/export-cashflow";
import { useCustomCosts } from "@/hooks/use-custom-costs";
import { useCACLTVAssumptions } from "@/hooks/use-cac-ltv-assumptions";
import { AddCostDialog } from "@/components/AddCostDialog";
import { Download, X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart,
} from "recharts";

interface SliderFieldProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  display: string;
}

function SliderField({ label, min, max, step, value, onChange, display }: SliderFieldProps) {
  return (
    <div>
      <label className="text-[9px] text-foreground-muted font-medium block mb-0.5">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-blue"
      />
      <div className="font-mono text-[10px] font-medium">{display}</div>
    </div>
  );
}

export default function CashFlowModel() {
  const [mntPts, setMntPts] = useState(10);
  const [rpmStart, setRpmStart] = useState(30);
  const [growth, setGrowth] = useState(10);
  const [ehr, setEhr] = useState(650);
  const [capital, setCapital] = useState(40000);
  const [visits, setVisits] = useState(2);

  const { onetimeCosts, monthlyCosts, addCost, removeCost } = useCustomCosts();
  const { assumptions: cacAssumptions, totalCac: cacPerPt } = useCACLTVAssumptions();

  const cacBudget = cacPerPt * cacAssumptions.targetPts;

  const customOnetimeHi = onetimeCosts.reduce((a, c) => a + c.hi, 0);
  const customMonthlyHi = monthlyCosts.reduce((a, c) => a + c.hi, 0);

  const months = useMemo(() => {
    const MR = 68, RR = 166, OT1 = 3125, DPP = 150, CRED = 3000, N = 12;
    const ms: any[] = [];

    for (let m = 1; m <= N; m++) {
      const moNames = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
      const o: any = { m, label: moNames[m - 1] };
      const mp = m <= 3 ? mntPts : Math.min(mntPts + Math.floor((m - 3) * 2), mntPts + 10);
      o.mntB = mp * visits * MR;
      const rp = Math.min(rpmStart + (m - 1) * growth, 300);
      o.rpmPts = rp;
      o.rpmB = rp * RR;
      o.totB = o.mntB + o.rpmB;
      o.mntR = m >= 2 && ms[m - 2] ? ms[m - 2].mntB : 0;
      if (m >= 4) {
        o.rpmR = ms[m - 4].rpmB;
      } else {
        o.rpmR = 0;
      }
      o.totR = o.mntR + o.rpmR;
      o.zv = ZIVIAN;
      o.ehr = ehr;
      o.ot = 0;
      if (m === 1) o.ot = OT1 + rpmStart * DPP + 3000 + customOnetimeHi;
      if (m === 2) o.ot = CRED;

      o.milestone = 0;
      if ([1, 2, 4, 6].includes(m)) o.milestone = 2000;

      o.customMonthly = customMonthlyHi;
      o.cacAcq = m === 1 ? cacBudget : 0;

      const cl = clinicalCost(rp, o.totB);
      o.rd = cl.rd; o.rn = cl.rn; o.ma = cl.ma; o.rpmTech = cl.rpm; o.bill = cl.bill;
      o.clinTotal = cl.total;
      o.totE = o.zv + o.ehr + o.ot + o.milestone + o.clinTotal + o.customMonthly + o.cacAcq;
      o.net = o.totR - o.totE;
      o.bal = (m === 1 ? capital : ms[m - 2].bal) + o.net;
      ms.push(o);
    }
    return ms;
  }, [mntPts, rpmStart, growth, ehr, capital, visits, customOnetimeHi, customMonthlyHi, cacBudget]);

  const minBal = Math.min(...months.map((m) => m.bal));
  const trM = months.findIndex((m) => m.bal === minBal) + 1;
  const fp = months.findIndex((m) => m.net > 0);
  const tE = months.reduce((s, m) => s + m.totE, 0);
  const tR = months.reduce((s, m) => s + m.totR, 0);
  const tClin = months.reduce((s, m) => s + m.clinTotal, 0);
  const tB = months.reduce((s, m) => s + m.totB, 0);
  const cB6 = months.slice(0, 6).reduce((s, m) => s + m.totB, 0);
  const cR6 = months.slice(0, 6).reduce((s, m) => s + m.totR, 0);

  const chartData = months.map((m) => ({
    name: m.label,
    cashIn: m.totR,
    expenses: -m.totE,
    balance: m.bal,
  }));

  return (
    <>
      <SectionTag color="blue">Cash flow — actual cash in account</SectionTag>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold tracking-tight">Cash-in-account model</h1>
        <button
          data-tour="cf-export"
          onClick={() => exportCashFlow(months, { capital })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-semibold hover:opacity-80 transition-opacity"
        >
          <Download className="w-3.5 h-3.5" />
          Export Excel
        </button>
      </div>
      <p className="text-xs text-foreground-secondary mb-5 max-w-[720px] leading-relaxed">
        Actual bank balance. All clinical costs variable per patient (RD, RN, MA, RPM Tech loaded + billing 4.5%). Platform costs (Zivian + EHR) are fixed. MNT cash Month 2, CCM/RPM cash Month 4.
      </p>

      <div data-tour="cf-kpis" className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        <KPICard color={minBal < 0 ? "red" : "green"} label="Lowest balance" value={<span className={minBal < 0 ? "text-red" : "text-green"}>{formatCurrency(minBal)}</span>} subtitle={`Month ${trM}`} />
        <KPICard color="blue" label="Cash-positive month" value={fp >= 0 ? `Month ${fp + 1}` : "N/A"} subtitle="Net inflow > outflow" />
        <KPICard color="coral" label="Y1 expenses" value={formatCurrency(tE)} subtitle={`Clinical: ${formatCurrency(tClin)} (${Math.round((tClin / tE) * 100)}%)`} />
        <KPICard color="green" label="Y1 cash received" value={formatCurrency(tR)} subtitle="After reimbursement lag" />
      </div>

      {/* Sliders */}
      <div data-tour="cf-sliders" className="bg-card rounded-lg p-3.5 mb-4">
        <h3 className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Adjust assumptions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <SliderField label="MNT patients" min={5} max={40} step={1} value={mntPts} onChange={setMntPts} display={`${mntPts} pts × ${visits} visits × $68`} />
          <SliderField label="CCM+RPM patients (Mo 1)" min={5} max={80} step={5} value={rpmStart} onChange={setRpmStart} display={`${rpmStart} pts @ $166/pt`} />
          <SliderField label="Monthly growth" min={0} max={25} step={5} value={growth} onChange={setGrowth} display={`+${growth} pts/mo`} />
          <SliderField label="EHR cost" min={400} max={1200} step={50} value={ehr} onChange={setEhr} display={`$${ehr}/mo`} />
          <SliderField label="Starting capital" min={40000} max={60000} step={1000} value={capital} onChange={setCapital} display={`$${capital.toLocaleString()}`} />
          <SliderField label="MNT visits/pt/mo" min={1} max={4} step={1} value={visits} onChange={setVisits} display={`${visits} visits @ $68`} />
        </div>
      </div>

      {/* Custom costs */}
      {(onetimeCosts.length > 0 || monthlyCosts.length > 0) && (
        <div className="bg-card rounded-lg p-3.5 mb-4">
          <h3 className="text-[9px] font-semibold uppercase tracking-[0.06em] text-foreground-secondary mb-2">Custom costs</h3>
          {onetimeCosts.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-1 border-b border-border text-[10px]">
              <span>{c.name} <span className="text-foreground-muted">(one-time)</span></span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-foreground-secondary">{formatCurrency(c.lo)} – {formatCurrency(c.hi)}</span>
                <button onClick={() => removeCost(c.id)} className="p-0.5 rounded hover:bg-red-light text-foreground-muted hover:text-red transition-colors"><X className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
          {monthlyCosts.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-1 border-b border-border text-[10px]">
              <span>{c.name} <span className="text-foreground-muted">(monthly)</span></span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-foreground-secondary">{formatCurrency(c.lo)} – {formatCurrency(c.hi)}</span>
                <button onClick={() => removeCost(c.id)} className="p-0.5 rounded hover:bg-red-light text-foreground-muted hover:text-red transition-colors"><X className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <AddCostDialog onAdd={addCost} />
      </div>

      {/* Revenue timeline bar */}
      <div data-tour="cf-timeline" className="flex rounded overflow-hidden h-4.5 text-[8px] font-semibold uppercase tracking-[0.03em] mb-3.5">
        <div className="flex-1 flex items-center justify-center text-primary-foreground bg-amber">Billing (Mo 1)</div>
        <div className="flex-1 flex items-center justify-center text-primary-foreground bg-teal">MNT $ (Mo 2)</div>
        <div className="flex-[2] flex items-center justify-center text-primary-foreground bg-blue">CCM/RPM $ (Mo 4)</div>
        <div className="flex-[8] flex items-center justify-center text-primary-foreground bg-green">Full revenue (Mo 4-12)</div>
      </div>

      {/* Table */}
      <div data-tour="cf-table" className="text-xs font-semibold uppercase tracking-[0.04em] text-foreground-secondary mb-2">Month-by-month cash flow</div>
      <div className="overflow-x-auto mb-4 -mx-4 px-4 pb-6 md:mx-0 md:px-0 md:pb-0 scrollbar-thin" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr>
              <th className="text-left text-[8px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-1 border-b-[1.5px] border-border" />
              {months.map((m) => (
                <th key={m.m} className="text-right text-[8px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-1 border-b-[1.5px] border-border whitespace-nowrap">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SectionRow label="Revenue billed" />
            <DataRow label="MNT billed" values={months.map((m) => m.mntB)} />
            <DataRow label="CCM/RPM billed" values={months.map((m) => m.rpmB)} />
            <DataRow label="CCM/RPM patients" values={months.map((m) => m.rpmPts)} isCount />
            <DataRow label="Total billed" values={months.map((m) => m.totB)} bold />
            <SectionRow label="Cash received (MNT ~30d, CCM/RPM ~90d)" />
            <DataRow label="MNT cash" values={months.map((m) => m.mntR)} positive />
            <DataRow label="CCM/RPM cash" values={months.map((m) => m.rpmR)} positive />
            <DataRow label="Total received" values={months.map((m) => m.totR)} positive bold />
            <SectionRow label="Fixed costs" />
            <DataRow label="Zivian" values={months.map((m) => m.zv)} negative />
            <DataRow label="EHR" values={months.map((m) => m.ehr)} negative />
            <DataRow label="One-time/devices" values={months.map((m) => m.ot)} negative />
            <DataRow label="Milestone bonuses" values={months.map((m) => m.milestone)} negative />
            <DataRow label={`CAC acquisition (${cacAssumptions.targetPts} pts)`} values={months.map((m) => m.cacAcq)} negative />
            {customMonthlyHi > 0 && (
              <DataRow label="Custom monthly" values={months.map((m) => m.customMonthly)} negative />
            )}
            <SectionRow label="Clinical variable costs (per patient, 15% burden loaded)" />
            <DataRow label="RD ($34.50/pt)" values={months.map((m) => m.rd)} negative />
            <DataRow label="RN ($25.88/pt)" values={months.map((m) => m.rn)} negative />
            <DataRow label="MA ($20.70/pt)" values={months.map((m) => m.ma)} negative />
            <DataRow label="RPM Tech ($25.83/pt)" values={months.map((m) => m.rpmTech)} negative />
            <DataRow label="Billing 4.5%" values={months.map((m) => m.bill)} negative />
            <DataRow label="Total expenses" values={months.map((m) => m.totE)} negative bold />
            <SectionRow label="Cash position" />
            <DataRow label="Net flow" values={months.map((m) => m.net)} auto bold />
            <tr>
              <td className="font-sans font-bold text-[10px] p-1 border-t-[1.5px] border-border whitespace-nowrap">Cash in account</td>
              {months.map((m) => (
                <td key={m.m} className={`text-right font-mono font-semibold text-[10px] p-1 border-t-[1.5px] border-border ${m.bal < 0 ? "text-red bg-red-light" : "text-green bg-green-light"}`}>
                  {formatCurrency(m.bal)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-lg p-3 mb-1">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 0% / 0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "hsl(48 4% 56%)", fontSize: 8 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(48 4% 56%)", fontSize: 8, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v < 0 ? "-$" : "$"}${Math.abs(Math.round(v / 1000))}K`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="cashIn" name="Cash in" fill="rgba(37,99,235,0.45)" radius={[3, 3, 0, 0]} stackId="a" />
            <Bar dataKey="expenses" name="Expenses" fill="rgba(220,74,45,0.35)" radius={[3, 3, 0, 0]} stackId="a" />
            <Line dataKey="balance" name="Balance" type="monotone" stroke="hsl(48 6% 10%)" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-2.5 text-[9px] text-foreground-muted mb-3.5">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(37,99,235,0.5)" }} />Cash in</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(220,74,45,0.4)" }} />Expenses</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-foreground opacity-50" />Balance</span>
      </div>

      {/* Insights */}
      {minBal < 0 ? (
        <InfoBox variant="warning" title={`Cash shortfall — month ${trM}`}>
          With ${capital.toLocaleString()} starting capital, balance hits {formatCurrency(minBal)} in month {trM}. Need <strong>{formatCurrency(Math.abs(minBal) + capital)}</strong> total, or MSO deficit funding loan bridges the gap. The 90-day CCM/RPM lag is the main driver.
        </InfoBox>
      ) : (
        <InfoBox variant="success" title="Cash stays positive all 12 months">
          With ${capital.toLocaleString()} starting capital, lowest balance is {formatCurrency(minBal)} in month {trM}. You have runway, but keep buffer for credentialing delays.
        </InfoBox>
      )}

      <InfoBox variant="emphasis" title="Variable costs scale perfectly">
        Month 1 ({months[0].rpmPts} pts): clinical costs = {formatCurrency(months[0].clinTotal)}/mo. Month 12 ({months[11].rpmPts} pts): clinical costs = {formatCurrency(months[11].clinTotal)}/mo. Because everything is per-patient, you never pay for idle capacity.
      </InfoBox>

      <InfoBox variant="note" title="MNT bridges months 2-3">
        MNT cash arrives Month 2 at ~{formatCurrency(months[0].mntB)}/mo. This is the only income until CCM/RPM cash hits Month 4.
      </InfoBox>

      <InfoBox variant="info" title="Reimbursement pipeline">
        Through month 6: billed <strong>{formatCurrency(cB6)}</strong>, received <strong>{formatCurrency(cR6)}</strong>. Pipeline gap: <strong>{formatCurrency(cB6 - cR6)}</strong> arriving months 7-9.
      </InfoBox>

      <InfoBox variant="question" title="Year 1 summary">
        <strong>Billed:</strong> {formatCurrency(tB)}<br />
        <strong>Cash received:</strong> {formatCurrency(tR)}<br />
        <strong>Expenses:</strong> {formatCurrency(tE)} (clinical: {formatCurrency(tClin)}, {Math.round((tClin / tE) * 100)}%)<br />
        <strong>Ending balance:</strong> {formatCurrency(months[11].bal)}<br />
        <strong>Pipeline:</strong> {formatCurrency(tB - tR)} arriving Year 2
      </InfoBox>

      <div className="mt-8 pt-3 border-t border-border flex justify-between text-[9px] text-foreground-muted">
        <span>March 2026 — Kehlin Swain, Greens Health</span>
        <span>kehlin.swain@greens.health</span>
      </div>
    </>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={13} className="bg-card font-sans font-semibold text-[8px] uppercase tracking-[0.04em] text-foreground-secondary p-1">
        {label}
      </td>
    </tr>
  );
}

function DataRow({ label, values, positive, negative, auto, bold, isCount }: {
  label: string;
  values: number[];
  positive?: boolean;
  negative?: boolean;
  auto?: boolean;
  bold?: boolean;
  isCount?: boolean;
}) {
  return (
    <tr className={bold ? "border-t-[1.5px] border-border" : ""}>
      <td className={`font-sans p-1 whitespace-nowrap ${bold ? "font-semibold" : ""}`}>{label}</td>
      {values.map((v, i) => {
        let colorClass = "";
        if (auto) colorClass = v < 0 ? "text-red" : v > 0 ? "text-green" : "text-foreground-muted";
        else if (positive) colorClass = v > 0 ? "text-green" : "text-foreground-muted";
        else if (negative) colorClass = v > 0 ? "text-red" : "text-foreground-muted";
        else colorClass = "text-foreground-muted";

        return (
          <td key={i} className={`text-right font-mono p-1 border-b border-border ${colorClass} ${bold ? "font-medium" : ""}`}>
            {v === 0 ? "—" : isCount && v < 1000 ? v : formatCurrency(v)}
          </td>
        );
      })}
    </tr>
  );
}
