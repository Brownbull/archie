import { create } from "zustand"

interface UiState {
  /* Populated in Story 1.2+ */
}

export const useUiStore = create<UiState>()(() => ({}))
