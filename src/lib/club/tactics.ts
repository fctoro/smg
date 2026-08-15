export interface SavedTacticalPlan {
  id: string;
  name: string;
  formationId: string;
  assignments: Record<string, string>;
  benchIds?: string[];
  createdAt: string;
}

export function getSavedPlans(): SavedTacticalPlan[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("fctoro_coach_plans");
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlan(plan: Omit<SavedTacticalPlan, "id" | "createdAt">): SavedTacticalPlan {
  const plans = getSavedPlans();
  const newPlan: SavedTacticalPlan = {
    ...plan,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  
  plans.push(newPlan);
  localStorage.setItem("fctoro_coach_plans", JSON.stringify(plans));
  return newPlan;
}

export function updatePlan(id: string, plan: Partial<Omit<SavedTacticalPlan, "id" | "createdAt">>): SavedTacticalPlan | null {
  const plans = getSavedPlans();
  const index = plans.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  const updatedPlan = {
    ...plans[index],
    ...plan,
  };
  
  plans[index] = updatedPlan;
  localStorage.setItem("fctoro_coach_plans", JSON.stringify(plans));
  return updatedPlan;
}

export function deletePlan(id: string) {
  const plans = getSavedPlans().filter((p) => p.id !== id);
  localStorage.setItem("fctoro_coach_plans", JSON.stringify(plans));
}

export function getTacticalPlan(id: string): SavedTacticalPlan | undefined {
  return getSavedPlans().find((p) => p.id === id);
}
