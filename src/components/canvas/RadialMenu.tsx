import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { componentLibrary } from "@/services/componentLibrary"
import {
  Trash2,
  Copy,
  Search,
  ArrowRightLeft,
  Scale,
  Link,
} from "lucide-react"

interface RadialItem {
  id: string
  label: string
  icon: React.ReactNode
  action: () => void
  disabled?: boolean
}

const RADIAL_RADIUS = 80
const ITEM_SIZE = 40
const ANIMATION_STAGGER_MS = 40

export function RadialMenu() {
  const contextMenu = useUiStore((s) => s.contextMenu)
  const closeContextMenu = useUiStore((s) => s.closeContextMenu)
  const setSelectedNodeId = useUiStore((s) => s.setSelectedNodeId)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [isVisible, setIsVisible] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const removeNode = useArchitectureStore((s) => s.removeNode)
  const duplicateNode = useArchitectureStore((s) => s.duplicateNode)

  const handleInspect = useCallback(() => {
    if (!contextMenu) return
    setSelectedNodeId(contextMenu.nodeId)
    closeContextMenu()
  }, [contextMenu, setSelectedNodeId, closeContextMenu])

  const handleDelete = useCallback(() => {
    if (!contextMenu) return
    removeNode(contextMenu.nodeId)
    closeContextMenu()
  }, [contextMenu, removeNode, closeContextMenu])

  const handleDuplicate = useCallback(() => {
    if (!contextMenu) return
    const newId = duplicateNode(contextMenu.nodeId)
    if (newId) setSelectedNodeId(newId)
    closeContextMenu()
  }, [contextMenu, duplicateNode, setSelectedNodeId, closeContextMenu])

  const handleTradeOffs = useCallback(() => {
    if (!contextMenu) return
    setSelectedNodeId(contextMenu.nodeId)
    closeContextMenu()
  }, [contextMenu, setSelectedNodeId, closeContextMenu])

  const openSwapTarget = useUiStore((s) => s.openSwapTarget)

  const handleSwap = useCallback(() => {
    if (!contextMenu) return
    setSelectedNodeId(contextMenu.nodeId)
    openSwapTarget(contextMenu.nodeId)
    closeContextMenu()
  }, [contextMenu, setSelectedNodeId, openSwapTarget, closeContextMenu])

  const items: RadialItem[] = useMemo(
    () =>
      contextMenu
        ? [
            { id: "inspect", label: "Inspect", icon: <Search size={18} />, action: handleInspect },
            { id: "duplicate", label: "Duplicate", icon: <Copy size={18} />, action: handleDuplicate },
            { id: "swap", label: "Swap", icon: <ArrowRightLeft size={18} />, action: handleSwap },
            { id: "trade-offs", label: "Trade-offs", icon: <Scale size={18} />, action: handleTradeOffs },
            { id: "connect", label: "Connect", icon: <Link size={18} />, action: () => closeContextMenu(), disabled: true },
            { id: "delete", label: "Delete", icon: <Trash2 size={18} />, action: handleDelete },
          ]
        : [],
    [contextMenu, handleInspect, handleDuplicate, handleSwap, handleTradeOffs, closeContextMenu, handleDelete],
  )

  useEffect(() => {
    if (contextMenu) {
      setIsVisible(false)
      setFocusedIndex(-1)
      requestAnimationFrame(() => setIsVisible(true))
    } else {
      setIsVisible(false)
    }
  }, [contextMenu])

  useEffect(() => {
    if (!contextMenu) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeContextMenu()
        return
      }

      const activeItems = items.filter((i) => !i.disabled)
      if (activeItems.length === 0) return

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = prev + 1
          return next >= items.length ? 0 : next
        })
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = prev - 1
          return next < 0 ? items.length - 1 : next
        })
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          const item = items[focusedIndex]
          if (!item.disabled) item.action()
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [contextMenu, closeContextMenu, focusedIndex, items])

  if (!contextMenu) return null

  const node = useArchitectureStore.getState().nodes.find((n) => n.id === contextMenu.nodeId)
  const component = node
    ? componentLibrary.getComponent(node.data.archieComponentId)
    : null

  return (
    <div
      ref={menuRef}
      data-testid="radial-menu"
      role="menu"
      aria-label={`Actions for ${component?.name ?? "component"}`}
      className="pointer-events-auto fixed z-50"
      style={{
        left: contextMenu.x - RADIAL_RADIUS - ITEM_SIZE / 2,
        top: contextMenu.y - RADIAL_RADIUS - ITEM_SIZE / 2,
        width: (RADIAL_RADIUS + ITEM_SIZE) * 2,
        height: (RADIAL_RADIUS + ITEM_SIZE) * 2,
      }}
    >
      {/* Center label */}
      <div
        className="absolute flex items-center justify-center rounded-full bg-bg-primary border border-border-primary shadow-lg"
        style={{
          left: RADIAL_RADIUS + ITEM_SIZE / 2 - 28,
          top: RADIAL_RADIUS + ITEM_SIZE / 2 - 28,
          width: 56,
          height: 56,
        }}
      >
        <span className="text-[10px] font-medium text-text-secondary truncate max-w-[48px] text-center leading-tight">
          {component?.name ?? "Node"}
        </span>
      </div>

      {/* Radial items */}
      {items.map((item, index) => {
        const angle = (index / items.length) * 2 * Math.PI - Math.PI / 2
        const x = RADIAL_RADIUS + ITEM_SIZE / 2 + Math.cos(angle) * RADIAL_RADIUS - ITEM_SIZE / 2
        const y = RADIAL_RADIUS + ITEM_SIZE / 2 + Math.sin(angle) * RADIAL_RADIUS - ITEM_SIZE / 2

        const isFocused = focusedIndex === index
        const delay = index * ANIMATION_STAGGER_MS

        return (
          <button
            key={item.id}
            data-testid={`radial-item-${item.id}`}
            role="menuitem"
            aria-label={item.label}
            aria-disabled={item.disabled}
            tabIndex={isFocused ? 0 : -1}
            disabled={item.disabled}
            onClick={(e) => {
              e.stopPropagation()
              if (!item.disabled) item.action()
            }}
            className={[
              "absolute flex flex-col items-center justify-center rounded-full",
              "border shadow-md transition-all duration-200",
              "hover:scale-110 active:scale-95",
              item.disabled
                ? "bg-bg-secondary border-border-primary text-text-tertiary cursor-not-allowed opacity-50"
                : isFocused
                  ? "bg-accent-primary border-accent-primary text-white ring-2 ring-accent-primary/50"
                  : "bg-bg-primary border-border-primary text-text-primary hover:border-accent-primary hover:text-accent-primary",
            ].join(" ")}
            style={{
              left: x,
              top: y,
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              opacity: isVisible ? 1 : 0,
              transform: isVisible
                ? `scale(1)`
                : `scale(0.3) translate(${(RADIAL_RADIUS + ITEM_SIZE / 2 - ITEM_SIZE / 2 - x) * 0.5}px, ${(RADIAL_RADIUS + ITEM_SIZE / 2 - ITEM_SIZE / 2 - y) * 0.5}px)`,
              transitionDelay: `${delay}ms`,
            }}
          >
            {item.icon}
            <span className="text-[8px] leading-none mt-0.5 font-medium">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
