import type { WeightProfile } from "@/lib/constants"

/** Looks up weight for a category, defaulting to 1.0 for unknown categories. */
export function getWeight(categoryId: string, weights: WeightProfile): number {
  return (categoryId in weights)
    ? weights[categoryId as keyof WeightProfile]
    : 1.0
}
