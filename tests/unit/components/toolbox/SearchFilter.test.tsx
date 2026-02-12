import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SearchFilter } from "@/components/toolbox/SearchFilter"
import { useUiStore } from "@/stores/uiStore"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

describe("SearchFilter", () => {
  beforeEach(() => {
    useUiStore.setState({ searchQuery: "" })
  })

  it("renders search input with placeholder", () => {
    render(<SearchFilter />)
    expect(screen.getByPlaceholderText("Filter components...")).toBeInTheDocument()
  })

  it("displays current search query value", () => {
    useUiStore.setState({ searchQuery: "redis" })
    render(<SearchFilter />)
    expect(screen.getByTestId("search-input")).toHaveValue("redis")
  })

  it("updates store on typing", async () => {
    render(<SearchFilter />)
    const input = screen.getByTestId("search-input")
    await userEvent.type(input, "post")
    expect(useUiStore.getState().searchQuery).toBe("post")
  })

  it("shows clear button when query is non-empty", () => {
    useUiStore.setState({ searchQuery: "redis" })
    render(<SearchFilter />)
    expect(screen.getByTestId("search-clear")).toBeInTheDocument()
  })

  it("hides clear button when query is empty", () => {
    render(<SearchFilter />)
    expect(screen.queryByTestId("search-clear")).not.toBeInTheDocument()
  })

  it("clears query on clear button click", async () => {
    useUiStore.setState({ searchQuery: "redis" })
    render(<SearchFilter />)
    await userEvent.click(screen.getByTestId("search-clear"))
    expect(useUiStore.getState().searchQuery).toBe("")
  })

  it("has maxLength attribute on input", () => {
    render(<SearchFilter />)
    expect(screen.getByTestId("search-input")).toHaveAttribute("maxLength", "100")
  })
})
