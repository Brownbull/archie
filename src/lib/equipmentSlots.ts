import { COMPONENT_TYPES } from "@/lib/componentTypes"

export interface EquipmentSlot {
  typeId: string
  slot: string
  shortSlot: string
  position: "left" | "right"
  row: number
}

const SLOT_MAP: EquipmentSlot[] = [
  // Left column (top to bottom)
  { typeId: "cache", slot: "Helmet", shortSlot: "Head", position: "left", row: 0 },
  { typeId: "load-balancer", slot: "Shoulders", shortSlot: "Shoulders", position: "left", row: 1 },
  { typeId: "cdn", slot: "Cape", shortSlot: "Back", position: "left", row: 2 },
  { typeId: "relational-db", slot: "Chest Armor", shortSlot: "Chest", position: "left", row: 3 },
  { typeId: "worker", slot: "Tabard", shortSlot: "Tabard", position: "left", row: 4 },
  { typeId: "message-queue", slot: "Gloves", shortSlot: "Hands", position: "left", row: 5 },
  { typeId: "nosql", slot: "Leg Armor", shortSlot: "Legs", position: "left", row: 6 },
  { typeId: "dns", slot: "Boots", shortSlot: "Feet", position: "left", row: 7 },
  { typeId: "compute", slot: "Main Weapon", shortSlot: "Main Hand", position: "left", row: 8 },

  // Right column (top to bottom)
  { typeId: "llm-gateway", slot: "Crown", shortSlot: "Crown", position: "right", row: 0 },
  { typeId: "search-engine", slot: "Necklace", shortSlot: "Neck", position: "right", row: 1 },
  { typeId: "api-gateway", slot: "Belt", shortSlot: "Waist", position: "right", row: 2 },
  { typeId: "event-stream", slot: "Bracers", shortSlot: "Wrists", position: "right", row: 3 },
  { typeId: "stream-processor", slot: "Shirt", shortSlot: "Shirt", position: "right", row: 4 },
  { typeId: "auth", slot: "Ring", shortSlot: "Ring 1", position: "right", row: 5 },
  { typeId: "rate-limiter", slot: "Ring", shortSlot: "Ring 2", position: "right", row: 6 },
  { typeId: "security", slot: "Trinket", shortSlot: "Trinket 1", position: "right", row: 7 },
  { typeId: "serverless", slot: "Off Hand", shortSlot: "Off Hand", position: "right", row: 8 },
]

const EXTRA_SLOTS: EquipmentSlot[] = [
  { typeId: "observability", slot: "Trinket", shortSlot: "Trinket 2", position: "left", row: 9 },
  { typeId: "realtime", slot: "Earring", shortSlot: "Earring", position: "right", row: 9 },
  { typeId: "etl", slot: "Quiver", shortSlot: "Quiver", position: "left", row: 10 },
  { typeId: "vector-store", slot: "Amulet", shortSlot: "Amulet", position: "right", row: 10 },
  { typeId: "graph-db", slot: "Rune Stone", shortSlot: "Rune", position: "left", row: 11 },
  { typeId: "time-series-db", slot: "Hourglass", shortSlot: "Hourglass", position: "right", row: 11 },
  { typeId: "object-storage", slot: "Backpack", shortSlot: "Backpack", position: "left", row: 12 },
  { typeId: "payments", slot: "Coin Pouch", shortSlot: "Pouch", position: "right", row: 12 },
]

export const ALL_EQUIPMENT_SLOTS = [...SLOT_MAP, ...EXTRA_SLOTS]


const CATEGORY_COLORS: Record<string, string> = {
  "compute": "#3b82f6", "data-storage": "#22c55e", "caching": "#f97316",
  "messaging": "#a855f7", "delivery-network": "#06b6d4", "real-time": "#ec4899",
  "auth-security": "#ef4444", "monitoring": "#eab308", "search": "#14b8a6",
}

export function getBlockColor(typeId: string): string {
  const t = COMPONENT_TYPES.get(typeId)
  return t ? (CATEGORY_COLORS[t.category] ?? "#6b7280") : "#6b7280"
}
