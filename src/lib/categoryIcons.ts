import type { CSSProperties } from "react"
import {
  Cpu, Database, Flame, MessageSquare, Globe,
  Radio, Shield, Activity, Search, Settings,
} from "lucide-react"
import { COMPONENT_CATEGORIES } from "@/lib/constants"

type CategoryIconName = (typeof COMPONENT_CATEGORIES)[keyof typeof COMPONENT_CATEGORIES]["iconName"]

export const CATEGORY_ICONS: Record<
  CategoryIconName,
  React.ComponentType<{ className?: string; style?: CSSProperties }>
> = {
  Cpu, Database, Flame, MessageSquare, Globe,
  Radio, Shield, Activity, Search, Settings,
}
