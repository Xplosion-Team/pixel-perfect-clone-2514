import * as XLSX from "xlsx";

const COL = (c: number) => XLSX.utils.encode_col(c);
const CELL = (r: number, c: number) => `${COL(c)}${r}`;

export function exportCashFlow(months: any[], params: { capital: number }) {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  const moLabels = months.map((m) => m.label);
  const N = moLabels.length;

  const set = (r: number, c: number, v: any, fmt?: string) => {
    const ref = CELL(r, c);
    if (typeof v === "string" && v.startsWith("=")) {
      ws[ref] = { t: "s", f: v.slice(1) };
    } else if (typeof v === "number") {
      ws[ref] = { t: "n", v, z: fmt || "$#,##0" };
    } else {
      ws[ref] = { t: "s", v: String(v) };
    }
  };

  // Row 1: Title
  set(1, 0, "FareRX — Cash-in-Account Model");

  // Assumptions
  let row = 3;
  set(row, 0, "Assumptions");

  const aRows: Record<string, number> = {};
  const assumptions = [
    ["MNT Rate ($/visit)", months[0] ? 68 : 68],
    ["CCM/RPM Rate ($/pt/mo)", months[0]?.rpmB && months[0]?.rpmPts ? Math.round(months[0].rpmB / months[0].rpmPts) : 166],
    ["Starting Capital", params.capital],
    ["Zivian ($/mo)", months[0]?.zv ?? 0],
    ["EHR ($/mo)", months[0]?.ehr ?? 0],
  ];
  assumptions.forEach(([label, val], i) => {
    const r = row + 1 + i;
    set(r, 0, label as string);
    set(r, 1, val as number);
    aRows[label as string] = r;
  });

  // Data table
  row = 11;
  set(row, 0, "");
  moLabels.forEach((l, i) => set(row, i + 1, l));
  set(row, N + 1, "Total");

  const dataStart = row + 1;
  const sections: { label: string; key: string; formula?: boolean }[] = [
    { label: "— REVENUE BILLED —", key: "_sec1" },
    { label: "MNT billed", key: "mntB" },
    { label: "CCM/RPM billed", key: "rpmB" },
    { label: "CCM/RPM patients", key: "rpmPts" },
    { label: "Total billed", key: "totB", formula: true },
    { label: "— CASH RECEIVED —", key: "_sec2" },
    { label: "MNT cash", key: "mntR" },
    { label: "CCM/RPM cash", key: "rpmR" },
    { label: "Total received", key: "totR", formula: true },
    { label: "— FIXED COSTS —", key: "_sec3" },
    { label: "Zivian", key: "zv" },
    { label: "EHR", key: "ehr" },
    { label: "One-time/legal", key: "ot" },
    { label: "Milestone bonuses", key: "milestone" },
    { label: "CAC acquisition", key: "cacAcq" },
    { label: "Custom monthly", key: "customMonthly" },
    { label: "— CLINICAL VARIABLE COSTS —", key: "_sec4" },
    { label: "RD (loaded)", key: "rd" },
    { label: "RN (loaded)", key: "rn" },
    { label: "MA (loaded)", key: "ma" },
    { label: "HealthArc (platform)", key: "ha" },
    { label: "RingCentral (comms)", key: "rc" },
    { label: "Billing %", key: "bill" },
    { label: "Total expenses", key: "totE", formula: true },
    { label: "— CASH POSITION —", key: "_sec5" },
    { label: "Net flow", key: "net", formula: true },
    { label: "Cash in account", key: "bal", formula: true },
  ];

  const rowMap: Record<string, number> = {};
  let r = dataStart;

  sections.forEach((sec) => {
    set(r, 0, sec.label);
    rowMap[sec.key] = r;

    if (sec.key.startsWith("_sec")) {
      r++;
      return;
    }

    months.forEach((m, i) => {
      const c = i + 1;
      const val = m[sec.key] ?? 0;

      if (sec.key === "totB") {
        set(r, c, `=${CELL(rowMap["mntB"], c)}+${CELL(rowMap["rpmB"], c)}`);
      } else if (sec.key === "totR") {
        set(r, c, `=${CELL(rowMap["mntR"], c)}+${CELL(rowMap["rpmR"], c)}`);
      } else if (sec.key === "totE") {
        const expKeys = ["zv", "ehr", "ot", "milestone", "cacAcq", "customMonthly", "rd", "rn", "ma", "ha", "rc", "bill"];
        const refs = expKeys.map((k) => CELL(rowMap[k], c)).join("+");
        set(r, c, `=${refs}`);
      } else if (sec.key === "net") {
        set(r, c, `=${CELL(rowMap["totR"], c)}-${CELL(rowMap["totE"], c)}`);
      } else if (sec.key === "bal") {
        if (i === 0) {
          set(r, c, `=${CELL(aRows["Starting Capital"], 1)}+${CELL(rowMap["net"], c)}`);
        } else {
          set(r, c, `=${CELL(r, c - 1)}+${CELL(rowMap["net"], c)}`);
        }
      } else {
        set(r, c, val);
      }
    });

    if (sec.key !== "bal" && sec.key !== "rpmPts") {
      const firstC = CELL(r, 1);
      const lastC = CELL(r, N);
      set(r, N + 1, `=SUM(${firstC}:${lastC})`);
    }

    r++;
  });

  const lastRow = r;
  ws["!ref"] = `A1:${COL(N + 1)}${lastRow}`;
  ws["!cols"] = [{ wch: 26 }, ...Array(N + 1).fill({ wch: 13 })];

  XLSX.utils.book_append_sheet(wb, ws, "Cash Flow");
  XLSX.writeFile(wb, "FareRX_CashFlow_Model.xlsx");
}
