import * as XLSX from "xlsx";

const COL = (c: number) => XLSX.utils.encode_col(c); // 0-indexed → "A","B",...
const CELL = (r: number, c: number) => `${COL(c)}${r}`; // 1-indexed row

export function exportCashFlow(months: any[], params: { capital: number }) {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  const moLabels = months.map((m) => m.label);
  const N = moLabels.length; // 12

  // Helper: set cell value
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

  const bold = (r: number, c: number) => {
    const ref = CELL(r, c);
    if (ws[ref]) ws[ref].s = { font: { bold: true } };
  };

  // --- Layout ---
  // Row 1: Title
  set(1, 0, "FareRX — Cash-in-Account Model");
  // Row 2: blank
  // Row 3: Assumptions header
  let row = 3;
  set(row, 0, "Assumptions");

  // Row 4-9: Assumptions as inputs (blue text cells)
  const aRows: Record<string, number> = {};
  const assumptions = [
    ["MNT Rate ($/visit)", months[0] ? 68 : 68],
    ["CCM/RPM Rate ($/pt/mo)", 166],
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

  // Data table starts
  row = 11;
  // Header row
  set(row, 0, "");
  moLabels.forEach((l, i) => set(row, i + 1, l));
  set(row, N + 1, "Total");

  // Data rows with formulas
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
    { label: "One-time/devices + legal", key: "ot" },
    { label: "Milestone bonuses", key: "milestone" },
    { label: "CAC acquisition", key: "cacAcq" },
    { label: "Custom monthly", key: "customMonthly" },
    { label: "— CLINICAL VARIABLE COSTS —", key: "_sec4" },
    { label: "RD ($34.50/pt)", key: "rd" },
    { label: "RN ($25.88/pt)", key: "rn" },
    { label: "MA ($20.70/pt)", key: "ma" },
    { label: "RPM Tech ($25.83/pt)", key: "rpmTech" },
    { label: "Billing 4.5%", key: "bill" },
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
      // section header — no data
      r++;
      return;
    }

    // Fill month values
    months.forEach((m, i) => {
      const c = i + 1;
      const val = m[sec.key] ?? 0;

      if (sec.key === "totB") {
        // =MNT billed + CCM/RPM billed
        set(r, c, `=${CELL(rowMap["mntB"], c)}+${CELL(rowMap["rpmB"], c)}`);
      } else if (sec.key === "totR") {
        set(r, c, `=${CELL(rowMap["mntR"], c)}+${CELL(rowMap["rpmR"], c)}`);
      } else if (sec.key === "totE") {
        // Sum of all expense rows
        const expKeys = ["zv", "ehr", "ot", "milestone", "rd", "rn", "ma", "rpmTech", "bill"];
        const refs = expKeys.map((k) => CELL(rowMap[k], c)).join("+");
        set(r, c, `=${refs}`);
      } else if (sec.key === "net") {
        set(r, c, `=${CELL(rowMap["totR"], c)}-${CELL(rowMap["totE"], c)}`);
      } else if (sec.key === "bal") {
        if (i === 0) {
          // Starting capital + net flow
          set(r, c, `=${CELL(aRows["Starting Capital"], 1)}+${CELL(rowMap["net"], c)}`);
        } else {
          set(r, c, `=${CELL(r, c - 1)}+${CELL(rowMap["net"], c)}`);
        }
      } else {
        set(r, c, val);
      }
    });

    // Total column (sum across months) for non-balance rows
    if (sec.key !== "bal" && sec.key !== "rpmPts") {
      const firstC = CELL(r, 1);
      const lastC = CELL(r, N);
      set(r, N + 1, `=SUM(${firstC}:${lastC})`);
    }

    r++;
  });

  // Set worksheet range
  const lastRow = r;
  ws["!ref"] = `A1:${COL(N + 1)}${lastRow}`;

  // Column widths
  ws["!cols"] = [{ wch: 26 }, ...Array(N + 1).fill({ wch: 13 })];

  XLSX.utils.book_append_sheet(wb, ws, "Cash Flow");
  XLSX.writeFile(wb, "FareRX_CashFlow_Model.xlsx");
}
