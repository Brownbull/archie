import { Icon } from "@iconify/react/dist/offline"
import "./registry"

interface LogoIconProps {
  /** Full Iconify name, e.g. `logos:aws-lambda`. */
  name: string
  className?: string
}

/** Renders an official vendor brand logo by Iconify name, fully offline (see registry.ts). */
export function LogoIcon({ name, className }: LogoIconProps) {
  return <Icon icon={name} className={className} data-testid="component-logo-icon" aria-hidden />
}
