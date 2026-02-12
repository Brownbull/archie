import { create } from "zustand"

interface ArchitectureState {
  /* Populated in Story 1.2+ */
}

export const useArchitectureStore = create<ArchitectureState>()(() => ({}))
