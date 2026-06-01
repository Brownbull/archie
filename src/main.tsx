import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@/index.css"
import "@/icons/registry" // register the offline `logos` set before first paint (official icon set)
import { App } from "@/App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
