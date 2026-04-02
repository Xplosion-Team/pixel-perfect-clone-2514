import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CACLTVAssumptions {
  patients: number;
  rdRate: number;
  rnRate: number;
  maRate: number;
  haRate: number;
  rcRate: number;
  rdHrs: number;
  rnHrs: number;
  maHrs: number;
  billingPct: number;
  revPt: number;
  cacDevice: number;
  cacMktg: number;
  cacOnboard: number;
  ltvMonths: number;
  targetPts: number;
  rampMo: number;
  fixedCost: number;
}

const DEFAULTS: CACLTVAssumptions = {
  patients: 100, rdRate: 40, rnRate: 45, maRate: 24, haRate: 16, rcRate: 4,
  rdHrs: 0.75, rnHrs: 0.50, maHrs: 0.75, billingPct: 4.5, revPt: 166,
  cacDevice: 150, cacMktg: 0, cacOnboard: 0, ltvMonths: 24,
  targetPts: 100, rampMo: 3, fixedCost: 2650,
};

export function useCACLTVAssumptions() {
  const [assumptions, setAssumptions] = useState<CACLTVAssumptions>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cac_ltv_assumptions").select("key, value");
      if (data && data.length > 0) {
        const obj = { ...DEFAULTS };
        data.forEach((row: any) => {
          if (row.key in obj) {
            (obj as any)[row.key] = Number(row.value);
          }
        });
        setAssumptions(obj);
      }
      setLoaded(true);
    })();
  }, []);

  const updateAssumption = useCallback(async (key: keyof CACLTVAssumptions, value: number) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
    // Upsert to DB
    await supabase
      .from("cac_ltv_assumptions")
      .update({ value })
      .eq("key", key);
  }, []);

  return { assumptions, updateAssumption, loaded };
}
