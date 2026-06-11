import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("firebase/firestore", () => ({
  increment: vi.fn((n: number) => ({ __increment: n })), doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), serverTimestamp: vi.fn() }))
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) =>
      id === "postgresql"
        ? {
            id: "postgresql",
            name: "PostgreSQL",
            configVariants: [
              { id: "single-node", name: "Single Node" },
              { id: "primary-replica", name: "Primary-Replica" },
            ],
          }
        : undefined,
    ),
  },
}))

import { SaveBlockDefaultButton } from "@/components/canvas/SaveBlockDefaultButton"
import { useUserBlockDefaultsStore } from "@/stores/userBlockDefaultsStore"
import { toast } from "sonner"

// Real COMPONENT_TYPES: relational-db → label "SQL Database", defaultProviderId "postgresql".
// System default therefore = { postgresql, single-node } (the mocked first variant).
describe("SaveBlockDefaultButton", () => {
  beforeEach(() => {
    useUserBlockDefaultsStore.setState({ defaults: {} })
    vi.clearAllMocks()
  })

  it("is clean when current config equals the system default (nothing saved)", () => {
    render(<SaveBlockDefaultButton typeId="relational-db" providerId="postgresql" variantId="single-node" />)
    expect(screen.getByTestId("save-block-default")).not.toHaveAttribute("data-dirty")
  })

  it("is dirty when the current variant differs from the default", () => {
    render(<SaveBlockDefaultButton typeId="relational-db" providerId="postgresql" variantId="primary-replica" />)
    expect(screen.getByTestId("save-block-default")).toHaveAttribute("data-dirty", "true")
  })

  it("is clean when current config equals the user's saved default", () => {
    useUserBlockDefaultsStore.setState({ defaults: { "relational-db": { providerId: "postgresql", variantId: "primary-replica" } } })
    render(<SaveBlockDefaultButton typeId="relational-db" providerId="postgresql" variantId="primary-replica" />)
    expect(screen.getByTestId("save-block-default")).not.toHaveAttribute("data-dirty")
  })

  it("opens the confirm dialog showing the current config and saves on Yes", async () => {
    const saveDefault = vi.fn().mockResolvedValue(undefined)
    useUserBlockDefaultsStore.setState({ defaults: {}, saveDefault })
    render(<SaveBlockDefaultButton typeId="relational-db" providerId="postgresql" variantId="primary-replica" />)

    fireEvent.click(screen.getByTestId("save-block-default"))
    const dialog = await screen.findByTestId("save-block-default-dialog")
    expect(dialog).toHaveTextContent("PostgreSQL")
    expect(dialog).toHaveTextContent("Primary-Replica")

    fireEvent.click(screen.getByTestId("save-block-default-confirm"))
    await waitFor(() => expect(saveDefault).toHaveBeenCalledWith("u1", "relational-db", "postgresql", "primary-replica"))
    expect(toast.success).toHaveBeenCalled()
  })

  it("does not save when the user picks No", async () => {
    const saveDefault = vi.fn()
    useUserBlockDefaultsStore.setState({ defaults: {}, saveDefault })
    render(<SaveBlockDefaultButton typeId="relational-db" providerId="postgresql" variantId="primary-replica" />)

    fireEvent.click(screen.getByTestId("save-block-default"))
    await screen.findByTestId("save-block-default-dialog")
    fireEvent.click(screen.getByRole("button", { name: "No" }))
    expect(saveDefault).not.toHaveBeenCalled()
  })
})
