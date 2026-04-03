export function formatCurrency(n: number): string {
  const neg = n < 0;
  return (neg ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString();
}

// Platform costs per patient per month
export const HA_RATE = 16;   // HealthArc (RPM device + CCM platform)
export const RC_RATE = 4;    // RingCentral (communication platform)
export const BILL_PCT = 0.045;
export const ZIVIAN = 2000;
export const BURDEN = 1.15;

// Dynamic clinical cost calculator using shared assumptions
export interface ClinicalRates {
  rdRate: number;
  rnRate: number;
  maRate: number;
  rdHrs: number;
  rnHrs: number;
  maHrs: number;
  haRate: number;
  rcRate: number;
  billingPct: number;
  revPt: number;
}

export const DEFAULT_RATES: ClinicalRates = {
  rdRate: 40, rnRate: 45, maRate: 24,
  rdHrs: 0.75, rnHrs: 0.50, maHrs: 0.75,
  haRate: HA_RATE, rcRate: RC_RATE,
  billingPct: 4.5, revPt: 166,
};

export function clinicalCostDynamic(pts: number, rates: ClinicalRates) {
  const rdLoaded = rates.rdRate * rates.rdHrs * BURDEN;
  const rnLoaded = rates.rnRate * rates.rnHrs * BURDEN;
  const maLoaded = rates.maRate * rates.maHrs * BURDEN;
  const ha = rates.haRate;
  const rc = rates.rcRate;
  const rev = rates.revPt * pts;
  const bill = rev * (rates.billingPct / 100);
  const perPt = rdLoaded + rnLoaded + maLoaded + ha + rc + (rates.revPt * rates.billingPct / 100);
  const total = perPt * pts;
  return {
    rdLoaded, rnLoaded, maLoaded, ha, rc,
    rd: Math.round(rdLoaded * pts),
    rn: Math.round(rnLoaded * pts),
    ma: Math.round(maLoaded * pts),
    haTotal: Math.round(ha * pts),
    rcTotal: Math.round(rc * pts),
    bill: Math.round(bill),
    perPt,
    total: Math.round(total),
  };
}

// Legacy wrapper for backward compat
export function clinicalCost(pts: number, rev: number) {
  const rates = { ...DEFAULT_RATES, revPt: rev / Math.max(pts, 1) };
  const r = clinicalCostDynamic(pts, rates);
  return { rd: r.rd, rn: r.rn, ma: r.ma, rpm: r.haTotal + r.rcTotal, bill: r.bill, total: r.total };
}

// Hardcoded loaded values (for reference / labels) derived from defaults
export const RD_LOADED = DEFAULT_RATES.rdRate * DEFAULT_RATES.rdHrs * BURDEN;
export const RN_LOADED = DEFAULT_RATES.rnRate * DEFAULT_RATES.rnHrs * BURDEN;
export const MA_LOADED = DEFAULT_RATES.maRate * DEFAULT_RATES.maHrs * BURDEN;

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
      { label: "Healthcare attorney + PC filing", lo: 3000, hi: 3125 },
      { label: "Name reservation", lo: 0, hi: 70 },
      { label: "EHR setup", lo: 0, hi: 1225 },
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
    title: "Monthly recurring (at 30 CCM/RPM + 10 MNT pts)",
    color: "coral",
    max: 1400,
    items: [
      { label: "Zivian (doctor mgmt + malpractice)", lo: 2000, hi: 2000 },
      { label: "EHR + billing platform", lo: 650, hi: 1162 },
    ],
  },
  milestones: {
    title: "Milestone bonuses ($2,000 each)",
    color: "blue",
    max: 8000,
    items: [
      { label: "Month 1 launch bonus", lo: 2000, hi: 2000 },
      { label: "Month 2 bonus", lo: 2000, hi: 2000 },
      { label: "Month 4 bonus", lo: 2000, hi: 2000 },
      { label: "Month 6 bonus", lo: 2000, hi: 2000 },
    ],
  },
};
