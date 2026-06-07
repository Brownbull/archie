import { usePreferencesStore } from "@/stores/preferencesStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { levelRank, type ExperienceLevel } from "@/lib/componentTypes"

/**
 * Fluidity P3c (D82/D84): the single shared "disclosure tier" that gates how much the app reveals.
 *
 * The tier IS `experienceLevel` — manual in FREE mode (the Beginner/Intermediate/Expert control), and
 * auto-set to the active challenge's difficulty in QUEST mode (selecting a quest already calls
 * setExperienceLevel(challenge.difficulty)). So one value drives the inspector/toolbox/dashboard gating
 * AND the on-node config disclosure — no parallel tier system.
 *
 * `showOnNodeConfig` is the new piece: on-node configuration controls (the config-tier picker) disclose
 * progressively in quests — hidden at beginner-difficulty quests, shown at intermediate+ — while FREE
 * mode always shows them ("all options available"). The gate is UI-only: it never touches the
 * simulation or the reference-solution harness, so challenge solvability (the 3★ check) is unaffected.
 */
export interface DisclosureTier {
  tier: ExperienceLevel
  isQuest: boolean
  showOnNodeConfig: boolean
}

export function useDisclosureTier(): DisclosureTier {
  const tier = usePreferencesStore((s) => s.experienceLevel)
  const isQuest = useChallengeStore((s) => isChallengeMode(s))
  const showOnNodeConfig = !isQuest || levelRank(tier) >= levelRank("intermediate")
  return { tier, isQuest, showOnNodeConfig }
}
