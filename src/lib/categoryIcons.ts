import type { CSSProperties } from "react"
import {
  Cpu, Database, Flame, MessageSquare, Globe,
  Radio, Shield, Activity, Search, Settings,
  Gauge, ShieldCheck, TrendingUp, Lock, Wrench, DollarSign, Code,
} from "lucide-react"
import { COMPONENT_CATEGORIES, METRIC_CATEGORIES } from "@/lib/constants"

type ComponentIconName = (typeof COMPONENT_CATEGORIES)[keyof typeof COMPONENT_CATEGORIES]["iconName"]
type MetricIconName = (typeof METRIC_CATEGORIES)[number]["iconName"]
type CategoryIconName = ComponentIconName | MetricIconName

export const CATEGORY_ICONS: Record<
  CategoryIconName,
  React.ComponentType<{ className?: string; style?: CSSProperties }>
> = {
  Cpu, Database, Flame, MessageSquare, Globe,
  Radio, Shield, Activity, Search, Settings,
  Gauge, ShieldCheck, TrendingUp, Lock, Wrench, DollarSign, Code,
}

/** Type-safe icon lookup replacing inline `as keyof typeof CATEGORY_ICONS` casts (TD-5-3a AC-3). */
export function getCategoryIcon(iconName: string): React.ComponentType<{ className?: string; style?: CSSProperties }> | undefined {
  if (!(iconName in CATEGORY_ICONS)) return undefined
  return CATEGORY_ICONS[iconName as CategoryIconName]
}
