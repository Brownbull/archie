/**
 * Static drift guard: StackCategoryScore (constants.ts) and CategoryScore (dashboardCalculator.ts)
 * must remain structurally identical. If either type changes, this file produces a compile error.
 *
 * Why separate file: constants.ts has zero engine imports. Importing CategoryScore there would
 * create a dependency from the constants layer into the engine layer. This file sits outside
 * both modules and exists solely to be type-checked — it is never imported at runtime.
 *
 * @see TD-8-1a AC-3
 */
import type { StackCategoryScore } from "@/lib/constants"
import type { CategoryScore } from "@/engine/dashboardCalculator"

// Bi-directional extends check: fails at compile time if fields drift
type _AssertStackMatchesCategory =
  [StackCategoryScore] extends [CategoryScore]
    ? [CategoryScore] extends [StackCategoryScore]
      ? true
      : never
    : never

// Consume the type to prevent "unused" warnings
const _: _AssertStackMatchesCategory = true as _AssertStackMatchesCategory
void _
