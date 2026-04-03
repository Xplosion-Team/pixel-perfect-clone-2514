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
  ltvMonths: number;
  targetPts: number;
  rampMo: number;
  fixedCost: number;
  // Meal delivery
  mealEnabled: number; // 0 or 1
  mealPct: number;
  mealCap: number;
  mealQty: number;
  mealRevPer: number;
  mealCostPer: number;
}

export interface CacItem {
  id: number;
  name: string;
  cat: "Marketing" | "Outreach" | "Admin" | "Other";
  amt: number;
}

const DEFAULT_CAC_ITEMS: CacItem[] = [
  { id: 1, name: "Digital / social ad cost per conversion", cat: "Marketing", amt: 25 },
  { id: 2, name: "Flyers, mailers, print materials", cat: "Marketing", amt: 10 },
  { id: 3, name: "Community health event booth", cat: "Marketing", amt: 15 },
  { id: 4, name: "Rep / liaison time per enrolled patient", cat: "Outreach", amt: 20 },
  { id: 5, name: "Provider education visit", cat: "Outreach", amt: 10 },
  { id: 6, name: "Office lunches / detail visits", cat: "Outreach", amt: 10 },
  { id: 7, name: "Enrollment labor (intake + consent)", cat: "Admin", amt: 20 },
  { id: 8, name: "Insurance eligibility verification", cat: "Admin", amt: 10 },
  { id: 9, name: "PECOS / payer credentialing lookup", cat: "Admin", amt: 5 },
  { id: 10, name: "Patient education session", cat: "Admin", amt: 5 },
];

const DEFAULTS: CACLTVAssumptions = {
  patients: 100, rdRate: 40, rnRate: 45, maRate: 24, haRate: 16, rcRate: 4,
  rdHrs: 0.75, rnHrs: 0.50, maHrs: 0.75, billingPct: 4.5, revPt: 166,
  ltvMonths: 24, targetPts: 100, rampMo: 3, fixedCost: 2650,
  mealEnabled: 0, mealPct: 40, mealCap: 360, mealQty: 10, mealRevPer: 6, mealCostPer: 4,
};

export function useCACLTVAssumptions() {
  const [assumptions, setAssumptions] = useState<CACLTVAssumptions>(DEFAULTS);
  const [cacItems, setCacItems] = useState<CacItem[]>(DEFAULT_CAC_ITEMS);
  const [nextId, setNextId] = useState(11);
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
        // Load CAC items from DB
        const cacData = data.filter((r: any) => r.key.startsWith("cacItem_"));
        if (cacData.length > 0) {
          try {
            const itemsJson = data.find((r: any) => r.key === "cacItemsJson");
            if (itemsJson) {
              const items = JSON.parse(String(itemsJson.value === 0 ? "[]" : ""));
              // fallback: cacItemsJson stores as a string in a separate approach
            }
          } catch { /* ignore */ }
        }
        setAssumptions(obj);
      }
      setLoaded(true);
    })();
  }, []);

  const updateAssumption = useCallback(async (key: keyof CACLTVAssumptions, value: number) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
    await supabase
      .from("cac_ltv_assumptions")
      .update({ value })
      .eq("key", key);
  }, []);

  const totalCac = cacItems.reduce((s, i) => s + (i.amt || 0), 0);

  const addCacItem = useCallback(() => {
    setCacItems(prev => [...prev, { id: nextId, name: "New assumption", cat: "Other", amt: 0 }]);
    setNextId(prev => prev + 1);
  }, [nextId]);

  const removeCacItem = useCallback((id: number) => {
    setCacItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateCacItem = useCallback((id: number, updates: Partial<CacItem>) => {
    setCacItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  return { assumptions, updateAssumption, loaded, cacItems, totalCac, addCacItem, removeCacItem, updateCacItem };
}
