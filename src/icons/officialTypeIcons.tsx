import {
  Users, Globe, Network, Split, Webhook, Server, Zap, Cog, Waves, Brain, CreditCard,
  Workflow, Database, Boxes, Share2, LayoutGrid, LineChart, HardDrive, Search, Flame,
  ListOrdered, Radio, Wifi, Activity, ShieldAlert, KeyRound, Gauge, History, Layers,
  LayoutTemplate, type LucideIcon,
} from "lucide-react"
import type { ToolboxTab } from "@/stores/uiStore"

/**
 * Lucide line icons for the fundamental logical TYPES, used in `official` icon-set mode — logical
 * blocks (Cache, CDN, Compute…) have no brand logo, so they get a clean, distinct semantic icon
 * instead of the pixel concept loop. Distinct per type so the palette stays readable rather than a
 * wall of identical category icons. Unknown ids return undefined (caller keeps the concept loop).
 */
const TYPE_LUCIDE: Readonly<Record<string, LucideIcon>> = {
  "traffic-source": Users,
  dns: Globe,
  cdn: Network,
  "load-balancer": Split,
  "api-gateway": Webhook,
  compute: Server,
  serverless: Zap,
  worker: Cog,
  "stream-processor": Waves,
  "llm-gateway": Brain,
  payments: CreditCard,
  etl: Workflow,
  "relational-db": Database,
  nosql: Boxes,
  "graph-db": Share2,
  "vector-store": LayoutGrid,
  "time-series-db": LineChart,
  "object-storage": HardDrive,
  "search-engine": Search,
  cache: Flame,
  "message-queue": ListOrdered,
  "event-stream": Radio,
  realtime: Wifi,
  observability: Activity,
  security: ShieldAlert,
  auth: KeyRound,
  "rate-limiter": Gauge,
}

export function getTypeLucideIcon(typeId: string): LucideIcon | undefined {
  // eslint-disable-next-line security/detect-object-injection -- typeId is a known type id
  return TYPE_LUCIDE[typeId]
}

/** Lucide icons for the 2×2 toolbox tab grid in `official` mode (the tabs are app UI, not vendors). */
const TAB_LUCIDE: Readonly<Record<ToolboxTab, LucideIcon>> = {
  components: Boxes,
  stacks: Layers,
  blueprints: LayoutTemplate,
  history: History,
}

export function getTabLucideIcon(tab: ToolboxTab): LucideIcon {
  // eslint-disable-next-line security/detect-object-injection -- tab is a ToolboxTab union value
  return TAB_LUCIDE[tab]
}
