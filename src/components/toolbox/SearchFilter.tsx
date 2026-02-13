import { Input } from "@/components/ui/input"
import { useUiStore } from "@/stores/uiStore"
import { X } from "lucide-react"

export function SearchFilter() {
  const searchQuery = useUiStore((s) => s.searchQuery)
  const setSearchQuery = useUiStore((s) => s.setSearchQuery)

  return (
    <div data-testid="search-filter" className="relative px-3 py-2">
      <Input
        data-testid="search-input"
        type="text"
        placeholder="Filter components..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        maxLength={100}
        className="h-8 pr-8 text-sm"
      />
      {searchQuery && (
        <button
          data-testid="search-clear"
          onClick={() => setSearchQuery("")}
          className="absolute right-5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-secondary hover:text-text-primary"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
