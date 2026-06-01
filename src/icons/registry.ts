/**
 * Registers the trimmed offline `logos` set with Iconify exactly once, at module load.
 *
 * Uses the OFFLINE entry of @iconify/react (`/dist/offline`), which excludes the network/API module
 * entirely — so <Icon> resolves these names synchronously from in-memory data with zero requests to
 * api.iconify.design. Imported as a side-effect by both main.tsx (early, before first paint) and
 * LogoIcon (so any logo render is self-sufficient). addCollection is idempotent across imports.
 */
import { addCollection } from "@iconify/react/dist/offline"
import { logosSubset } from "./logos.generated"

addCollection(logosSubset)
