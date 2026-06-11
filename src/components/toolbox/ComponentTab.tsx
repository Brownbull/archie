import { useCallback, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Sparkles, Target } from "lucide-react"
import { useLibrary } from "@/hooks/useLibrary"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { usePathwaySuggestions } from "@/hooks/usePathwaySuggestions"
import { TypeBlockCard } from "@/components/toolbox/TypeBlockCard"
import { RequiredFilterToggle } from "@/components/toolbox/RequiredFilterToggle"
import { PathwayGuidancePanel } from "@/components/dashboard/PathwayGuidancePanel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { groupComponentsByType, typeMatchesQuery, typeWithinLevel, type BlockLockReason, type ComponentTypeGroup } from "@/lib/componentTypes"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { componentLibrary } from "@/services/componentLibrary"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { getAllChallenges } from "@/services/challengeLoader"
import { resolveTechTree } from "@/engine/techTree"

/** Maps a component-category id to its display label, falling back to the raw id. */
function categoryLabel(id: string): string {
  return COMPONENT_CATEGORIES[id as ComponentCategoryId]?.label ?? id
}

/**
 * Shown atop the component palette while a challenge is active — it connects challenge
 * mode to the toolbox by spelling out which component categories the brief needs (and,
 * when the challenge restricts them via allowedCategories, that only those are available).
 */
function ChallengeGuidanceBanner({
  required,
  allowed,
}: {
  required: readonly string[]
  allowed: readonly string[] | null
}) {
  if (required.length === 0 && !allowed) return null
  return (
    <div
      data-testid="challenge-component-guidance"
      className="mb-3 rounded-md border border-blue-500/40 bg-blue-500/10 p-2 text-[0.6875rem] text-text-secondary"
    >
      <div className="flex items-center gap-1.5 font-medium text-text-primary">
        <Target className="h-3 w-3 text-blue-400" />
        {allowed ? "Allowed for this challenge" : "This challenge needs"}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {(allowed ?? required).map((cat) => (
          <span key={cat} className="rounded-full bg-surface px-1.5 py-0.5 text-[0.625rem] text-text-primary">
            {categoryLabel(cat)}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ComponentTab() {
  const { components, searchComponents } = useLibrary()
  const searchQuery = useUiStore((s) => s.searchQuery)
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)
  const experienceLevel = usePreferencesStore((s) => s.experienceLevel)
  const { suggestions: pathwaySuggestions } = usePathwaySuggestions()

  // Surface "what to add next" inline in the toolbox (where you add components) during free
  // build — not buried in the dashboard overlay. Hidden while searching or in a challenge
  // (which has its own guidance banner), and only when the engine has suggestions.
  const showPathway = !searchQuery && !activeChallenge && pathwaySuggestions.length > 0

  // Challenge guidance: required categories are always shown; allowedCategories (optional)
  // additionally restricts the palette to those categories for the duration of the challenge.
  const requiredCategories = useMemo(() => activeChallenge?.requiredComponents ?? [], [activeChallenge])
  const allowedCategories = activeChallenge?.allowedCategories?.length
    ? activeChallenge.allowedCategories
    : null
  const selectedArchieComponentId = useArchitectureStore(
    useCallback(
      (s) => {
        if (!selectedNodeId) return null
        return s.nodes.find((n) => n.id === selectedNodeId)?.data.archieComponentId ?? null
      },
      [selectedNodeId],
    ),
  )

  const selectedComponent = useMemo(() => {
    if (!selectedArchieComponentId) return null
    return componentLibrary.getComponent(selectedArchieComponentId) ?? null
  }, [selectedArchieComponentId])

  const incompatibleIds = useMemo(() => {
    if (!selectedComponent) return new Set<string>()
    const ids = new Set<string>()
    for (const comp of components) {
      const result = checkCompatibility(
        { category: selectedComponent.category, compatibility: selectedComponent.compatibility },
        { category: comp.category, compatibility: comp.compatibility },
      )
      if (!result.isCompatible) ids.add(comp.id)
    }
    return ids
  }, [selectedComponent, components])

  // Collapsible CATEGORY sections. The palette now lists logical-block TYPES (the architect
  // builds with concepts, then picks a vendor in the inspector); types are grouped under their
  // visual category. Default expanded; an active search force-expands so matches aren't hidden.
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const toggleCategory = useCallback((key: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])
  // "More advanced blocks" drawer holds the above-level types (P86 progressive disclosure).
  // Collapsed by default; force-open below if no in-level blocks would otherwise show.
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // P5: search matches provider name/tags (existing) OR the fundamental type's label/synonyms,
  // so concept queries ("cache", "lb") surface the right type even if no provider name matches.
  // Phase 2 hard-gate: compute the effective block palette for challenge mode (D45-AC2).
  // For origin=user challenges, available_blocks is intersected with the player's unlocked
  // blocks so a self-authored wide-palette challenge can't bypass the progression gate.
  const completedChallenges = useUserProgressStore((s) => s.completedChallenges)
  const challengeBlockSet = useMemo(() => {
    if (!activeChallenge?.availableBlocks?.length) return null
    const allowed = new Set(activeChallenge.availableBlocks)
    if (activeChallenge.origin === "user") {
      const { unlockedBlocks } = resolveTechTree(getAllChallenges(), completedChallenges)
      return new Set([...allowed].filter((b) => unlockedBlocks.has(b)))
    }
    return allowed
  }, [activeChallenge, completedChallenges])

  // S6b (D89): the challenge's banned set. Shown-but-locked in the palette — the player learns the
  // rule ("no cache in this quest — hard 0★") instead of wondering where the block went.
  const bannedTypeSet = useMemo(
    () => new Set(activeChallenge?.forbiddenTypes ?? []),
    [activeChallenge],
  )

  // Toolbox realism (P4-S5, D94): in quest mode the player's WHOLE unlocked toolbox stays visible.
  // Blocks outside the quest palette render gray-locked (`not-in-palette` — the S6b slot reserved
  // for exactly this) instead of vanishing, so the toolbox reads as YOUR toolbox, with this quest
  // offering a subset — not a toolbox that mysteriously shrinks per quest.
  const unlockedTypeSet = useMemo(() => {
    if (!activeChallenge) return null
    return resolveTechTree(getAllChallenges(), completedChallenges).unlockedBlocks
  }, [activeChallenge, completedChallenges])

  // The expert-currency spend (P4-S5): once purchased for this quest, the palette can be narrowed
  // to just the graded blocks. Ownership is persistent (userProgress); the on/off is session-local
  // and BOUND to the quest id — switching quests naturally deactivates it, no reset effect needed.
  const [requiredFilterState, setRequiredFilterState] = useState<{ id: string | null; on: boolean }>({ id: null, on: false })
  const requiredOnly = requiredFilterState.on && requiredFilterState.id === (activeChallenge?.id ?? null)
  const setRequiredOnly = useCallback(
    (on: boolean) => setRequiredFilterState({ id: useChallengeStore.getState().activeChallenge?.id ?? null, on }),
    [],
  )
  const requiredFilterOwned = useUserProgressStore(
    (s) => !!activeChallenge && !!s.requiredFilterUnlocked[activeChallenge.id],
  )
  const requiredTypeSet = useMemo(
    () => new Set(activeChallenge?.requiredTypes ?? []),
    [activeChallenge],
  )
  const hasRequiredTargets = requiredTypeSet.size > 0 || requiredCategories.length > 0
  const requiredFilterActive = requiredOnly && requiredFilterOwned && hasRequiredTargets

  const filtered = useMemo(() => {
    // S6b: banned types bypass the category + palette filters — they must be VISIBLE (locked) even
    // though Phase 1's config-consistency guard keeps them out of available_blocks.
    const isBanned = (c: (typeof components)[number]) => !!c.typeId && bannedTypeSet.has(c.typeId)
    // P4-S5: unlocked types also bypass the quest filters — VISIBLE but gray-locked below.
    const isUnlocked = (c: (typeof components)[number]) => !!c.typeId && !!unlockedTypeSet?.has(c.typeId)
    // Restrict to challenge-allowed categories first (no-op when the challenge sets none).
    let scoped = allowedCategories
      ? components.filter((c) => allowedCategories.includes(c.category) || isBanned(c) || isUnlocked(c))
      : components
    // Phase 2: hard-gate by available block types (tight type-level gate on top of category).
    if (challengeBlockSet) {
      scoped = scoped.filter((c) => (c.typeId && challengeBlockSet.has(c.typeId)) || isBanned(c) || isUnlocked(c))
    }
    // P4-S5: the purchased required-blocks filter — focus the palette on what the brief grades.
    if (requiredFilterActive) {
      scoped = scoped.filter(
        (c) => (c.typeId && requiredTypeSet.has(c.typeId)) || requiredCategories.includes(c.category),
      )
    }
    if (!searchQuery) return scoped
    const q = searchQuery.toLowerCase()
    const nameMatches = new Set(searchComponents(searchQuery).map((c) => c.id))
    return scoped.filter((c) => nameMatches.has(c.id) || typeMatchesQuery(c, q))
  }, [searchQuery, components, searchComponents, allowedCategories, challengeBlockSet, bannedTypeSet, unlockedTypeSet, requiredFilterActive, requiredTypeSet, requiredCategories])

  // Lock classifier for the card: banned outranks everything; otherwise a block outside the quest's
  // palette (category- or type-gated) is `not-in-palette` — visible, gray-locked, never draggable.
  const lockReasonFor = useCallback(
    (g: ComponentTypeGroup): BlockLockReason | null => {
      if (!activeChallenge || !g.typeId) return null
      if (bannedTypeSet.has(g.typeId)) return "banned"
      const inCategory = !allowedCategories || allowedCategories.includes(g.categoryId)
      const inPalette = !challengeBlockSet || challengeBlockSet.has(g.typeId)
      return inCategory && inPalette ? null : "not-in-palette"
    },
    [activeChallenge, bannedTypeSet, allowedCategories, challengeBlockSet],
  )

  // Organize the palette by fundamental TYPE (one logical-block per type), then group those
  // type-blocks under their visual category for the collapsible sections.
  const groups = useMemo(() => groupComponentsByType(filtered), [filtered])

  // P86 progressive disclosure: partition by experience level. At/below-level blocks render in
  // their category sections; above-level blocks fall into the "More advanced blocks" drawer.
  // Quest mode: show ALL blocks flat (no level gating — the quest controls the palette).
  // Search: bypasses gating — searching means the user wants to see everything.
  const showAllLevels = searchQuery.length > 0 || !!activeChallenge
  const inLevelGroups = useMemo(
    () => (showAllLevels ? groups : groups.filter((g) => typeWithinLevel(g.typeId, experienceLevel))),
    [groups, showAllLevels, experienceLevel],
  )
  const advancedGroups = useMemo(
    () => (showAllLevels ? [] : groups.filter((g) => !typeWithinLevel(g.typeId, experienceLevel))),
    [groups, showAllLevels, experienceLevel],
  )

  const categorySections = useMemo(() => {
    const byCategory = new Map<ComponentCategoryId, ComponentTypeGroup[]>()
    for (const g of inLevelGroups) {
      const arr = byCategory.get(g.categoryId) ?? []
      arr.push(g)
      byCategory.set(g.categoryId, arr)
    }
    return [...byCategory.entries()].map(([categoryId, typeGroups]) => ({ categoryId, typeGroups }))
  }, [inLevelGroups])

  // Advanced drawer contents, ordered by category then label so the extras list reads tidily.
  const advancedSorted = useMemo(
    () =>
      [...advancedGroups].sort(
        (a, b) => a.categoryId.localeCompare(b.categoryId) || a.label.localeCompare(b.label),
      ),
    [advancedGroups],
  )
  // Force the drawer open when nothing would show otherwise (e.g. a challenge restricted to
  // above-level categories) so the toolbox is never visibly empty.
  const advancedExpanded = advancedOpen || categorySections.length === 0

  const isDimmed = useCallback(
    (g: ComponentTypeGroup) => g.providers.length > 0 && g.providers.every((p) => incompatibleIds.has(p.id)),
    [incompatibleIds],
  )

  if (filtered.length === 0) {
    return (
      <div data-testid="component-tab-empty" className="p-3">
        {activeChallenge && (
          <ChallengeGuidanceBanner required={requiredCategories} allowed={allowedCategories} />
        )}
        <p className="p-3 text-center text-sm text-text-secondary">
          {searchQuery ? "No matching components" : "No components loaded"}
        </p>
      </div>
    )
  }

  return (
    <ScrollArea data-testid="component-tab" className="h-full">
      <div className="space-y-3 p-3">
        {activeChallenge && (
          <ChallengeGuidanceBanner required={requiredCategories} allowed={allowedCategories} />
        )}
        {activeChallenge && hasRequiredTargets && (
          <RequiredFilterToggle
            challengeId={activeChallenge.id}
            active={requiredFilterActive}
            onToggle={setRequiredOnly}
          />
        )}
        {showPathway && (
          <div data-testid="component-tab-pathway" className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2">
            <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-secondary">Suggested next</p>
            <PathwayGuidancePanel hideWhenEmpty maxItems={2} />
          </div>
        )}
        {categorySections.map(({ categoryId, typeGroups }) => {
          const category = COMPONENT_CATEGORIES[categoryId]
          const IconComponent = category ? CATEGORY_ICONS[category.iconName] : undefined
          const isCollapsed = !searchQuery && collapsedCategories.has(categoryId)

          return (
            <div key={categoryId} data-testid={`category-group-${categoryId}`}>
              <button
                type="button"
                data-testid={`category-toggle-${categoryId}`}
                aria-expanded={!isCollapsed}
                onClick={() => toggleCategory(categoryId)}
                className="mb-2 flex w-full items-center gap-1.5 rounded px-0.5 py-0.5 hover:bg-surface"
              >
                {isCollapsed
                  ? <ChevronRight className="h-3 w-3 shrink-0 text-text-secondary" />
                  : <ChevronDown className="h-3 w-3 shrink-0 text-text-secondary" />}
                {IconComponent && (
                  <IconComponent className="h-3.5 w-3.5" style={{ color: category?.color }} />
                )}
                <h3
                  className="text-[0.6875rem] font-semibold uppercase tracking-wider"
                  style={{ color: category?.color }}
                >
                  {category?.label ?? categoryId}
                </h3>
                <span className="text-[0.625rem] text-text-secondary">({typeGroups.length})</span>
              </button>
              {!isCollapsed && (
                <div className="grid grid-cols-2 gap-2">
                  {typeGroups.map((g) => (
                    <TypeBlockCard key={g.key} group={g} dimmed={isDimmed(g)} lockReason={lockReasonFor(g)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {advancedGroups.length > 0 && (
          <div data-testid="advanced-blocks">
            <button
              type="button"
              data-testid="advanced-blocks-toggle"
              aria-expanded={advancedExpanded}
              onClick={() => setAdvancedOpen((o) => !o)}
              className="mb-2 flex w-full items-center gap-1.5 rounded px-0.5 py-0.5 hover:bg-surface"
            >
              {advancedExpanded
                ? <ChevronDown className="h-3 w-3 shrink-0 text-text-secondary" />
                : <ChevronRight className="h-3 w-3 shrink-0 text-text-secondary" />}
              <Sparkles className="h-3.5 w-3.5 text-text-secondary" />
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary">
                More advanced blocks
              </h3>
              <span className="text-[0.625rem] text-text-secondary">({advancedGroups.length})</span>
            </button>
            {advancedExpanded && (
              <div className="grid grid-cols-2 gap-2">
                {advancedSorted.map((g) => (
                  <TypeBlockCard key={g.key} group={g} dimmed={isDimmed(g)} lockReason={lockReasonFor(g)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
