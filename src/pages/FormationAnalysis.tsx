import { SectionTag } from "@/components/ui/section-tag";
import { KPICard } from "@/components/ui/kpi-card";
import { InfoBox } from "@/components/ui/info-box";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from "recharts";

const costData = [
  { year: "Year 0", pc: 125, pllc: 125 },
  { year: "Year 1", pc: 132, pllc: 832 },
  { year: "Year 2", pc: 139, pllc: 1539 },
  { year: "Year 3", pc: 146, pllc: 2246 },
  { year: "Year 4", pc: 153, pllc: 2953 },
  { year: "Year 5", pc: 160, pllc: 3660 },
];

const timelineItems = [
  { week: "Week 1", title: "Engage healthcare attorney", desc: "Attorney prepares PC Articles of Incorporation + Board pre-approval submission package", cost: "$3,000", status: "default" },
  { week: "Week 1-2", title: "Submit pre-approval to State Board of Medicine", desc: "Mail to P.O. Box 2649, Harrisburg PA 17105-2649. Include proposed name, physician license verification, draft Articles, cover letter.", cost: "$0", status: "default" },
  { week: "Week 2-8", title: "Board reviews and approves (CANNOT be expedited)", desc: "This is the critical path bottleneck. Use this time to finalize the MSA, Continuity Agreement, and operating documents with the attorney.", cost: "2-8 week wait", status: "crit" },
  { week: "Week 8-9", title: "File Articles of Incorporation with Dept. of State", desc: "File online at file.dos.pa.gov. Include Docketing Statement (DSCB:15-134A). Can expedite processing for $100-$1,000 at this stage.", cost: "$125 (+ $70 name reservation optional)", status: "default" },
  { week: "Week 9", title: "Obtain EIN + open business bank account", desc: "Apply for EIN at irs.gov (free, same day). Open PC bank account — this is where ALL Medicare revenue must flow per CPOM compliance.", cost: "$0", status: "default" },
  { week: "Week 9", title: "Execute MSA + Continuity Agreement", desc: "Sign Management Services Agreement (EBS-modeled) and Continuity Agreement with physician. Engage Zivian for doctor management.", cost: "Included in attorney fee + Zivian $2,000/mo starts", status: "default" },
  { week: "Week 9-12", title: "Begin credentialing + Medicare enrollment", desc: "Credential with 15+ commercial payer plans. Enroll in Medicare via PECOS (CMS-855B + CMS-855I). This runs in parallel — 60-120 day lead time.", cost: "$3,000", status: "wait" },
  { week: "Week 12-16", title: "Onboard EHR + RPM devices", desc: "Select and deploy EHR platform ($650-$1,200/mo). Procure RPM devices for initial 30-patient cohort.", cost: "EHR: $650-$1,200/mo | Devices: $4,500", status: "default" },
  { week: "Week 16-20", title: "Credentialing completes → begin billing", desc: "First patients enrolled in MNT + CCM + RPM. MNT cash arrives ~30 days after billing. CCM/RPM cash arrives ~90 days after billing.", cost: "Revenue begins", status: "done" },
];

const statusDot: Record<string, string> = {
  default: "border-blue bg-background",
  crit: "border-red bg-red",
  wait: "border-amber bg-amber",
  done: "border-green bg-green",
};

export default function FormationAnalysis() {
  return (
    <>
      <SectionTag color="purple">Confidential — FareRX + Greens Health</SectionTag>
      <h1 className="text-[26px] font-bold tracking-tight leading-tight mb-1.5">PC vs. PLLC formation analysis</h1>
      <p className="text-[13px] text-foreground-secondary mb-6 max-w-[700px] leading-relaxed">
        Verified costs from official Pennsylvania state sources. We originally budgeted $300 for PLLC filing — the actual cost is $125, but a hidden $700/year annual fee makes the PLLC significantly more expensive. A Professional Corporation (PC) is the better choice.
      </p>

      <div className="grid grid-cols-3 gap-2.5 mb-6">
        <KPICard color="green" label="PC filing cost" value="$125" subtitle="+ $7/year annual report" />
        <KPICard color="red" label="PLLC hidden annual fee" value={<>$700<span className="text-xs text-foreground-secondary">/yr</span></>} subtitle="Per physician member — due April 15" />
        <KPICard color="blue" label="5-year savings (PC vs PLLC)" value="$3,465" subtitle="Same compliance, same protection" />
      </div>

      <InfoBox variant="warning" title="What we found that wasn't in the original budget">
        The PLLC filing is $125 (not $300 as originally estimated) — but underneath that is a <strong>$700/year Certificate of Annual Registration (CAR) fee per physician member</strong>, due every April 15. This was increased from $610 effective December 31, 2024 per 15 Pa.C.S. §8998(b)(2). For a single-doctor PLLC, that's $700/year. For a 3-doctor practice, $2,100/year. PCs don't pay this fee at all.
      </InfoBox>

      <InfoBox variant="info" title="There's also a mandatory 2-8 week delay">
        Pennsylvania requires <strong>State Board of Medicine pre-approval before filing</strong> — for both PCs and PLLCs. This takes 2-8 weeks and <strong>cannot be expedited</strong> regardless of what you pay for faster Department of State processing. This is the gating item for your entire Phase 1 timeline.
      </InfoBox>

      {/* Side by side comparison */}
      <h2 className="text-lg font-bold tracking-tight mt-8 mb-3.5 pt-6 border-t border-border">PC vs. PLLC — side by side</h2>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* PC card */}
        <div className="rounded-xl p-5 border-2 border-green bg-green-light">
          <span className="inline-block text-[9px] font-semibold uppercase tracking-[0.06em] px-2.5 py-0.5 rounded-full text-green bg-green-light border border-green-muted mb-2">Recommended</span>
          <h4 className="text-sm font-semibold mb-1">Professional Corporation (PC)</h4>
          <div className="font-mono text-[28px] font-medium my-2">$132<span className="text-[13px] font-normal text-foreground-secondary">/year</span></div>
          <ul className="space-y-1 text-xs text-foreground-secondary">
            {["Formation filing: $125", "Annual report: $7/year (Jan-Jun)", "No CAR fee — ever", "C-Corp tax election: yes (default)", "S-Corp tax election: yes", "Board pre-approval: 2-8 weeks", "CPOM compliant: yes", "Governance: bylaws + board of directors", "MSA/Continuity compatible: yes", "Governing law: 15 Pa.C.S. Chapter 29"].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        {/* PLLC card */}
        <div className="rounded-xl p-5 border border-border">
          <span className="inline-block text-[9px] font-semibold uppercase tracking-[0.06em] px-2.5 py-0.5 rounded-full text-red bg-red-light mb-2">Not recommended</span>
          <h4 className="text-sm font-semibold mb-1">PLLC (Restricted Professional Co.)</h4>
          <div className="font-mono text-[28px] font-medium my-2 text-red">$832<span className="text-[13px] font-normal text-foreground-secondary">/year</span></div>
          <ul className="space-y-1 text-xs text-foreground-secondary">
            {["Formation filing: $125", "Annual report: $7/year (Sep 30)", "CAR fee: $700/member/year (Apr 15)", "C-Corp tax election: yes", "S-Corp tax election: yes", "Board pre-approval: 2-8 weeks", "CPOM compliant: yes", "Governance: operating agreement (flexible)", "MSA/Continuity compatible: yes", "Governing law: 15 Pa.C.S. Chapter 88"].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <InfoBox variant="success" title="Why PC wins">
        Both entities require the same $125 filing fee and the same Board pre-approval process. Both satisfy PA CPOM requirements. Both can elect C-Corp tax status. The <strong>only functional difference</strong> is the PLLC's $700/year CAR fee vs. the PC's $7/year annual report. The PC is the clear winner: <strong>$693/year savings with zero downside</strong>.
      </InfoBox>

      {/* Chart */}
      <h3 className="text-sm font-semibold mt-5 mb-2">Cumulative cost over 5 years</h3>
      <div className="bg-card rounded-lg p-3.5 mb-1">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 0% / 0.04)" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "hsl(48 4% 56%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(48 4% 56%)", fontSize: 10, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Area dataKey="pc" name="PC" type="monotone" stroke="rgba(5,150,105,0.8)" fill="rgba(5,150,105,0.08)" strokeWidth={2} dot={{ r: 4, fill: "#059669" }} />
            <Area dataKey="pllc" name="PLLC" type="monotone" stroke="rgba(220,38,38,0.6)" fill="rgba(220,38,38,0.06)" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, fill: "#DC2626" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3.5 text-[10px] text-foreground-muted mb-4">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(5,150,105,0.7)" }} />PC (recommended)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(220,38,38,0.5)" }} />PLLC</span>
      </div>

      {/* Detailed comparison table */}
      <h2 className="text-lg font-bold tracking-tight mt-8 mb-3.5 pt-6 border-t border-border">Verified costs — line by line</h2>
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse text-xs mb-4">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-2 border-b-[1.5px] border-border">Item</th>
              <th className="text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-2 border-b-[1.5px] border-border">PC</th>
              <th className="text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-2 border-b-[1.5px] border-border">PLLC</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-2 border-b-[1.5px] border-border">Source</th>
            </tr>
          </thead>
          <tbody>
            {[
              { item: "Formation filing fee", pc: "$125", pllc: "$125", source: "PA Dept. of State" },
              { item: "Docketing statement", pc: "$0", pllc: "$0", source: "Filed with formation docs" },
              { item: "Board pre-approval fee", pc: "$0", pllc: "$0", source: "49 Pa. Code § 16.21" },
              { item: "Name reservation (optional)", pc: "$70", pllc: "$70", source: "PA Dept. of State" },
              { item: "EIN from IRS", pc: "$0", pllc: "$0", source: "IRS.gov — free" },
              { item: "Annual report", pc: "$7/yr", pllc: "$7/yr", source: "PA Dept. of State", pcGreen: true },
              { item: "Certificate of Annual Registration (CAR)", pc: "$0", pllc: "$700/member/yr", source: "15 Pa.C.S. §8998(b)", pcGreen: true, pllcRed: true },
              { item: "Late CAR penalty", pc: "N/A", pllc: "$500 if after May 15", source: "PA Dept. of State", pcGreen: true, pllcRed: true },
            ].map((row) => (
              <tr key={row.item}>
                <td className="font-medium p-2.5 border-b border-border">{row.item}</td>
                <td className={`text-right p-2.5 border-b border-border ${row.pcGreen ? "text-green font-semibold" : ""}`}>{row.pc}</td>
                <td className={`text-right p-2.5 border-b border-border ${row.pllcRed ? "text-red font-semibold" : ""}`}>{row.pllc}</td>
                <td className="p-2.5 border-b border-border text-[10px] text-foreground-muted">{row.source}</td>
              </tr>
            ))}
            <tr className="bg-green-light">
              <td className="font-semibold p-2.5 border-b border-border">Year 1 total ongoing cost</td>
              <td className="text-right p-2.5 border-b border-border text-green text-sm font-semibold">$7</td>
              <td className="text-right p-2.5 border-b border-border text-red text-sm font-semibold">$707</td>
              <td className="p-2.5 border-b border-border" />
            </tr>
            <tr className="bg-green-light">
              <td className="font-semibold p-2.5">5-year total ongoing cost</td>
              <td className="text-right p-2.5 text-green text-sm font-semibold">$35</td>
              <td className="text-right p-2.5 text-red text-sm font-semibold">$3,535</td>
              <td className="p-2.5" />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pre-approval process */}
      <h2 className="text-lg font-bold tracking-tight mt-8 mb-3.5 pt-6 border-t border-border">Pre-approval: who, where, how</h2>

      <ContactCard title="Submit pre-approval to:" items={[
        { dt: "Entity", dd: "Pennsylvania State Board of Medicine" },
        { dt: "Mailing", dd: "P.O. Box 2649, Harrisburg, PA 17105-2649" },
        { dt: "Physical", dd: "2525 N 7th Street, Harrisburg, PA 17110" },
        { dt: "Phone", dd: "(717) 783-1400" },
        { dt: "Fax", dd: "(717) 787-7769" },
        { dt: "Portal", dd: "www.pals.pa.gov (PA Licensing System)" },
        { dt: "BPOA info", dd: "(717) 787-8503" },
        { dt: "Timeline", dd: "2-8 weeks (cannot be expedited)", ddClass: "text-red font-semibold" },
        { dt: "Fee", dd: "$0 — no pre-approval fee", ddClass: "text-green font-semibold" },
      ]} />

      <h3 className="text-sm font-semibold mt-5 mb-2.5">What to include in the submission</h3>
      <InfoBox variant="note" title="Pre-approval package checklist">
        1. <strong>Proposed corporate name</strong> — must comply with Board naming rules (49 Pa. Code § 45.202)<br />
        2. <strong>Physician's active PA medical license verification</strong> — unrestricted, in good standing<br />
        3. <strong>Draft Articles of Incorporation</strong> — showing PC restricted to medical services<br />
        4. <strong>Cover letter</strong> — identifying the physician(s) who will be shareholders<br />
        5. <strong>No separate fee required</strong> — Board reviews at no cost<br /><br />
        The Board will not provide legal advice or advisory opinions. Submit clean, compliant documents the first time. Have the healthcare attorney prepare this package.
      </InfoBox>

      <h3 className="text-sm font-semibold mt-5 mb-2.5">After Board approval: file with Department of State</h3>
      <ContactCard title="Department of State filing details:" items={[
        { dt: "Portal", dd: "file.dos.pa.gov" },
        { dt: "Form", dd: "Articles of Incorporation — Professional Corporation (DSCB:15-2903/7102)" },
        { dt: "Also file", dd: "Docketing Statement (DSCB:15-134A) — no additional fee" },
        { dt: "Filing fee", dd: "$125", ddClass: "font-semibold" },
        { dt: "Expedited", dd: "Same-day $100 | 3-hour $300 | 1-hour $1,000" },
        { dt: "Annual report", dd: "$7/year — due Jan 1 to Jun 30" },
      ]} />

      {/* Formation Timeline */}
      <h2 className="text-lg font-bold tracking-tight mt-8 mb-3.5 pt-6 border-t border-border">Formation timeline</h2>

      <InfoBox variant="info" title="Critical path: Board pre-approval is the gating item">
        Nothing else can start until the Board approves. The 2-8 week wait cannot be shortened. Begin credentialing immediately after filing — credentialing (60-120 days) runs in parallel and is the second longest lead time. Plan for first patient enrollment 4-5 months from today.
      </InfoBox>

      <div className="relative pl-7 my-4">
        <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-background-muted rounded-sm" />
        {timelineItems.map((item, i) => (
          <div key={i} className="relative mb-4">
            <div className={`absolute -left-5 top-1.5 w-3 h-3 rounded-full border-[2.5px] ${statusDot[item.status]}`} />
            <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted mb-0.5">{item.week}</div>
            <div className="text-[13px] font-semibold mb-0.5">{item.title}</div>
            <div className="text-[11px] text-foreground-secondary leading-relaxed">{item.desc}</div>
            <div className="font-mono text-[11px] font-medium text-blue mt-0.5">{item.cost}</div>
          </div>
        ))}
      </div>

      {/* Corrected budget */}
      <h2 className="text-lg font-bold tracking-tight mt-8 mb-3.5 pt-6 border-t border-border">Corrected startup budget</h2>
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-2 border-b-[1.5px] border-border">Item</th>
              <th className="text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-2 border-b-[1.5px] border-border">Original estimate</th>
              <th className="text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-2 border-b-[1.5px] border-border">Verified cost</th>
              <th className="text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-2 border-b-[1.5px] border-border">Delta</th>
            </tr>
          </thead>
          <tbody>
            {[
              { item: "Entity filing", orig: "$300", verified: "$125", delta: "-$175", cls: "text-green" },
              { item: "Annual registration (CAR)", orig: "Not budgeted", verified: "$0/yr (PC)", delta: "Avoided entirely", cls: "text-green" },
              { item: "PLLC annual fee (if we had gone PLLC)", orig: "Not budgeted", verified: "$700/yr", delta: "Avoided by choosing PC", cls: "text-green", vCls: "text-red" },
              { item: "Board pre-approval", orig: "Not budgeted", verified: "$0 (but +2-8 wks)", delta: "Timeline impact", cls: "text-amber" },
              { item: "Healthcare attorney", orig: "$3,000", verified: "$3,000", delta: "No change", cls: "" },
            ].map((row) => (
              <tr key={row.item}>
                <td className="font-medium p-2.5 border-b border-border">{row.item}</td>
                <td className="text-right p-2.5 border-b border-border">{row.orig}</td>
                <td className={`text-right p-2.5 border-b border-border font-semibold ${row.vCls || row.cls}`}>{row.verified}</td>
                <td className={`text-right p-2.5 border-b border-border font-semibold ${row.cls}`}>{row.delta}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border">
              <td className="font-semibold p-2.5">One-time startup total</td>
              <td className="text-right p-2.5 font-semibold">$3,600</td>
              <td className="text-right p-2.5 text-green text-sm font-semibold">$3,125</td>
              <td className="text-right p-2.5 text-green font-semibold">-$475</td>
            </tr>
          </tbody>
        </table>
      </div>

      <InfoBox variant="success" title="Decision documented">
        <strong>We are proceeding with a Professional Corporation (PC), not a PLLC.</strong> The PC saves $693/year per physician member with identical legal protection, CPOM compliance, and C-Corp tax election capability. This decision applies to all future deals using the FareRX MSO structure — the $693/year savings compounds across every practice in the portfolio.
      </InfoBox>

      {/* Key resources */}
      <h2 className="text-lg font-bold tracking-tight mt-8 mb-3.5 pt-6 border-t border-border">Key resources</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-2 border-b-[1.5px] border-border">Resource</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted p-2 border-b-[1.5px] border-border">Link / Contact</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Board of Medicine (mail)", "P.O. Box 2649, Harrisburg, PA 17105-2649"],
              ["Board of Medicine (physical)", "2525 N 7th Street, Harrisburg, PA 17110"],
              ["Board phone", "(717) 783-1400"],
              ["Board fax", "(717) 787-7769"],
              ["PA Licensing System", "www.pals.pa.gov"],
              ["Dept. of State filing portal", "file.dos.pa.gov"],
              ["BPOA info line", "(717) 787-8503"],
              ["Board forms/resources", "pa.gov/agencies/dos/department-and-offices/bpoa/boards-commissions/medicine/resources-and-documents"],
              ["PECOS (Medicare enrollment)", "pecos.cms.hhs.gov"],
              ["Governing law — PCs", "15 Pa.C.S. Chapter 29"],
              ["Board rules — PCs", "49 Pa. Code § 16.21"],
              ["Corporate name approval", "49 Pa. Code § 45.202"],
              ["CAR fees (PLLCs only)", "15 Pa.C.S. §8998(b)"],
            ].map(([resource, link]) => (
              <tr key={resource}>
                <td className="font-medium p-2.5 border-b border-border">{resource}</td>
                <td className="p-2.5 border-b border-border font-medium">{link}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-9 pt-3.5 border-t border-border flex justify-between text-[10px] text-foreground-muted">
        <span>March 2026 — Kehlin Swain, Greens Health</span>
        <span>kehlin.swain@greens.health</span>
      </div>
    </>
  );
}

function ContactCard({ title, items }: { title: string; items: { dt: string; dd: string; ddClass?: string }[] }) {
  return (
    <div className="bg-card rounded-xl p-5 my-5">
      <h4 className="text-[13px] font-semibold mb-2.5">{title}</h4>
      <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1 text-xs">
        {items.map((item) => (
          <span key={item.dt} className="contents">
            <dt className="text-foreground-muted font-medium">{item.dt}</dt>
            <dd className={`font-medium ${item.ddClass || ""}`}>{item.dd}</dd>
          </span>
        ))}
      </dl>
    </div>
  );
}
