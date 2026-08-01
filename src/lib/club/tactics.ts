export interface SavedTacticalPlan {
  id: string;
  name: string;
  formationId: string;
  assignments: Record<string, string>;
  createdAt: string;
}

export function getSavedPlans(): SavedTacticalPlan[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("fctoro_coach_plans");
  if (!stored) return [];
  try {
    return JSON.parse(stored);
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
  
  // We can just append, or overwrite if we wanted to support "updating" a plan.
  // For simplicity, we'll just append it as a new save snapshot.
  plans.push(newPlan);
  localStorage.setItem("fctoro_coach_plans", JSON.stringify(plans));
  return newPlan;
}

export function deletePlan(id: string) {
  const plans = getSavedPlans().filter((p) => p.id !== id);
  localStorage.setItem("fctoro_coach_plans", JSON.stringify(plans));
}

export function getTacticalPlan(id: string): SavedTacticalPlan | undefined {
  return getSavedPlans().find((p) => p.id === id);
}
