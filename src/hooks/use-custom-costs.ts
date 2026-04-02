import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomCost {
  id: string;
  name: string;
  lo: number;
  hi: number;
  type: "onetime" | "monthly";
}

export function useCustomCosts() {
  const [costs, setCosts] = useState<CustomCost[]>([]);

  // Load from database on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("custom_costs")
        .select("id, name, lo, hi, type")
        .order("created_at", { ascending: true });
      if (data) {
        setCosts(data.map((r) => ({ id: r.id, name: r.name, lo: Number(r.lo), hi: Number(r.hi), type: r.type as "onetime" | "monthly" })));
      }
    };
    load();
  }, []);

  const addCost = useCallback(async (cost: Omit<CustomCost, "id">) => {
    const { data, error } = await supabase
      .from("custom_costs")
      .insert({ name: cost.name, lo: cost.lo, hi: cost.hi, type: cost.type })
      .select("id, name, lo, hi, type")
      .single();
    if (data && !error) {
      setCosts((prev) => [...prev, { id: data.id, name: data.name, lo: Number(data.lo), hi: Number(data.hi), type: data.type as "onetime" | "monthly" }]);
    }
  }, []);

  const removeCost = useCallback(async (id: string) => {
    await supabase.from("custom_costs").delete().eq("id", id);
    setCosts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const onetimeCosts = costs.filter((c) => c.type === "onetime");
  const monthlyCosts = costs.filter((c) => c.type === "monthly");

  return { costs, onetimeCosts, monthlyCosts, addCost, removeCost };
}
