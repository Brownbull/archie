// Barrel re-export for shared test helpers
export {
  makeMetric,
  makeConfigVariant,
  makeComponent,
  makeNode,
  makeEdge,
} from "./factories"

export {
  createMockComponentLibrary,
  STANDARD_TEST_COMPONENTS,
} from "./mockComponentLibrary"

export {
  emptyArchitecture,
  singleNodeArchitecture,
  connectedPairArchitecture,
  fullArchitecture,
} from "./fixtures"
export type { ArchitectureFixture } from "./fixtures"
