import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ComponentCard } from "@/components/toolbox/ComponentCard"
import type { Component } from "@/schemas/componentSchema"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

const mockComponent: Component = {
  id: "postgresql",
  name: "PostgreSQL",
  category: "data-storage",
  description: "Relational database",
  is: "An open-source relational database",
  gain: ["ACID compliance", "Extensible"],
  cost: ["Higher memory usage"],
  tags: ["database", "sql"],
  baseMetrics: [{ id: "latency", value: "medium", numericValue: 5, category: "performance" }],
  configVariants: [
    { id: "default", name: "Default", metrics: [{ id: "latency", value: "low", numericValue: 3, category: "performance" }] },
  ],
}

describe("ComponentCard", () => {
  it("renders component name", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
  })

  it("renders IS section", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByText("An open-source relational database")).toBeInTheDocument()
  })

  it("renders GAIN items", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByText("ACID compliance")).toBeInTheDocument()
    expect(screen.getByText("Extensible")).toBeInTheDocument()
  })

  it("renders COST items", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByText("Higher memory usage")).toBeInTheDocument()
  })

  it("renders tags as badges", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByText("database")).toBeInTheDocument()
    expect(screen.getByText("sql")).toBeInTheDocument()
  })

  it("has correct test id", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByTestId("component-card-postgresql")).toBeInTheDocument()
  })
})
