import { useState, useEffect, useCallback } from "react";

export interface CustomCost {
  id: string;
  name: string;
  lo: number;
  hi: number;
  type: "onetime" | "monthly";
}

const STORAGE_KEY = "farerx-custom-costs";

function loadCosts(): CustomCost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useCustomCosts() {
  const [costs, setCosts] = useState<CustomCost[]>(loadCosts);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(costs));
  }, [costs]);

  const addCost = useCallback((cost: Omit<CustomCost, "id">) => {
    setCosts((prev) => [...prev, { ...cost, id: crypto.randomUUID() }]);
  }, []);

  const removeCost = useCallback((id: string) => {
    setCosts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const onetimeCosts = costs.filter((c) => c.type === "onetime");
  const monthlyCosts = costs.filter((c) => c.type === "monthly");

  return { costs, onetimeCosts, monthlyCosts, addCost, removeCost };
}
