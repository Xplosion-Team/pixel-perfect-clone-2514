export function formatCurrency(n: number): string {
  const neg = n < 0;
  return (neg ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString();
}

// Clinical variable costs per patient per month (loaded with 15% payroll burden)
export const RD_LOADED = 34.50;
export const RN_LOADED = 25.88;
export const MA_LOADED = 20.70;
export const RPM_TECH = 25.83;
export const BILL_PCT = 0.045;
export const CLINICAL_PER_PT = RD_LOADED + RN_LOADED + MA_LOADED + RPM_TECH;
export const ZIVIAN = 2000;

export function clinicalCost(pts: number, rev: number) {
  const rd = Math.round(pts * RD_LOADED);
  const rn = Math.round(pts * RN_LOADED);
  const ma = Math.round(pts * MA_LOADED);
  const rpm = Math.round(pts * RPM_TECH);
  const bill = Math.round(rev * BILL_PCT);
  return { rd, rn, ma, rpm, bill, total: rd + rn + ma + rpm + bill };
}

export interface BudgetSection {
  title: string;
  color: string;
  max: number;
  items: { label: string; lo: number; hi: number }[];
}

export const BUDGET_DATA: Record<string, BudgetSection> = {
  onetime: {
    title: "One-time startup",
    color: "blue",
    max: 6000,
    items: [
      { label: "Healthcare attorney", lo: 3000, hi: 3000 },
      { label: "PC filing", lo: 125, hi: 125 },
      { label: "Name reservation", lo: 0, hi: 70 },
      { label: "EHR setup", lo: 0, hi: 1225 },
      { label: "RPM devices (30 pts)", lo: 1200, hi: 5250 },
    ],
  },
  preenroll: {
    title: "Pre-enrollment",
    color: "green",
    max: 4000,
    items: [
      { label: "Credentialing (15+ plans)", lo: 3000, hi: 3000 },
      { label: "Non-profit filing (Phase 2)", lo: 300, hi: 600 },
    ],
  },
  monthly: {
    title: "Monthly recurring (at 30 CCM/RPM + 15 MNT pts)",
    color: "coral",
    max: 1400,
    items: [
      { label: "Zivian (doctor mgmt + malpractice)", lo: 2000, hi: 2000 },
      { label: "EHR + billing platform", lo: 650, hi: 1162 },
      { label: "RPM software", lo: 150, hi: 900 },
      { label: "RD loaded ($34.50 × 30 pts)", lo: 1035, hi: 1035 },
      { label: "RN loaded ($25.88 × 30 pts)", lo: 776, hi: 776 },
      { label: "MA loaded ($20.70 × 30 pts)", lo: 621, hi: 621 },
      { label: "RPM Tech ($25.83 × 30 pts)", lo: 775, hi: 775 },
      { label: "Billing & coding (4.5% of ~$7K)", lo: 315, hi: 315 },
      { label: "Prior auth (optional)", lo: 0, hi: 260 },
    ],
  },
};
