import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ScenarioSelector } from "@/components/canvas/ScenarioSelector"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { ScenarioPreset } from "@/lib/demandTypes"
import { SCENARIO_SELECTOR_TESTID, SCENARIO_BANNER_TESTID, SCENARIO_NONE_LABEL } from "@/lib/constants"

const MOCK_PRESETS: ScenarioPreset[] = [
  {
    id: "traffic-peak",
    name: "Traffic Peak",
    description: "High traffic scenario",
    icon: "TrendingUp",
    demandProfile: {
      "traffic-volume": "extreme",
      "data-size": "medium",
      "concurrent-users": "high",
      "geographic-spread": "single-region",
      "burst-pattern": "periodic-spikes",
    },
  },
  {
    id: "cost-optimized",
    name: "Cost Optimized",
    description: "Cost focused scenario",
    icon: "DollarSign",
    demandProfile: {
      "traffic-volume": "low",
      "data-size": "low",
      "concurrent-users": "low",
      "geographic-spread": "single-region",
      "burst-pattern": "steady",
    },
  },
]

vi.mock("@/services/scenarioLoader", () => ({
  getAllScenarioPresets: () => MOCK_PRESETS,
  getScenarioPreset: (id: string) => MOCK_PRESETS.find((p) => p.id === id),
  isKnownScenarioId: (id: string) => MOCK_PRESETS.some((p) => p.id === id),
}))

describe("ScenarioSelector", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useArchitectureStore.setState({
      activeScenarioId: null,
      nodes: [
        {
          id: "node-1",
          type: "archie-component",
          position: { x: 0, y: 0 },
          data: {
            archieComponentId: "test-comp",
            activeConfigVariantId: "default",
            componentName: "Test",
            componentCategory: "compute",
          },
        },
      ] as ReturnType<typeof useArchitectureStore.getState>["nodes"],
    })
  })

  it("renders the scenario selector dropdown", () => {
    render(<ScenarioSelector />)
    expect(screen.getByTestId(SCENARIO_SELECTOR_TESTID)).toBeInTheDocument()
  })

  it("shows 'No Scenario' as default when no scenario active", () => {
    render(<ScenarioSelector />)
    expect(screen.getByText(SCENARIO_NONE_LABEL)).toBeInTheDocument()
  })

  it("does NOT render banner when no scenario active", () => {
    render(<ScenarioSelector />)
    expect(screen.queryByTestId(SCENARIO_BANNER_TESTID)).not.toBeInTheDocument()
  })

  it("renders banner with scenario name when scenario is active", () => {
    useArchitectureStore.setState({ activeScenarioId: "traffic-peak" })
    render(<ScenarioSelector />)
    const banner = screen.getByTestId(SCENARIO_BANNER_TESTID)
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveTextContent("Simulating: Traffic Peak")
  })

  it("calls setActiveScenario(null) when 'No Scenario' selected", async () => {
    const setActiveScenario = vi.fn()
    useArchitectureStore.setState({
      activeScenarioId: "traffic-peak",
      setActiveScenario,
    })
    render(<ScenarioSelector />)

    const user = userEvent.setup()
    const trigger = screen.getByRole("combobox")
    await user.click(trigger)

    const noScenarioOption = screen.getByText(SCENARIO_NONE_LABEL)
    await user.click(noScenarioOption)

    expect(setActiveScenario).toHaveBeenCalledWith(null)
  })

  it("calls setActiveScenario with preset ID when preset selected", async () => {
    const setActiveScenario = vi.fn()
    useArchitectureStore.setState({ setActiveScenario })
    render(<ScenarioSelector />)

    const user = userEvent.setup()
    const trigger = screen.getByRole("combobox")
    await user.click(trigger)

    const trafficOption = screen.getByText("Traffic Peak")
    await user.click(trafficOption)

    expect(setActiveScenario).toHaveBeenCalledWith("traffic-peak")
  })

  it("renders all preset names in the dropdown", async () => {
    render(<ScenarioSelector />)

    const user = userEvent.setup()
    const trigger = screen.getByRole("combobox")
    await user.click(trigger)

    for (const preset of MOCK_PRESETS) {
      expect(screen.getByText(preset.name)).toBeInTheDocument()
    }
  })
})
