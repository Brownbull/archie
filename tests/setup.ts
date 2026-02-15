import "@testing-library/jest-dom"

// Polyfill localStorage for Node.js 22+ (built-in localStorage has broken setItem)
// Zustand persist middleware needs a working localStorage at module init time
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.setItem !== "function") {
  const store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach((key) => delete store[key]) },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  } as Storage
}

// Polyfill ResizeObserver for jsdom (needed by cmdk/command palette)
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Polyfill scrollIntoView for jsdom (needed by cmdk)
if (typeof HTMLElement.prototype.scrollIntoView === "undefined") {
  HTMLElement.prototype.scrollIntoView = function () {}
}

// Polyfill pointer capture for jsdom (needed by Radix UI Select)
if (typeof HTMLElement.prototype.hasPointerCapture === "undefined") {
  HTMLElement.prototype.hasPointerCapture = function () {
    return false
  }
}
if (typeof HTMLElement.prototype.setPointerCapture === "undefined") {
  HTMLElement.prototype.setPointerCapture = function () {}
}
if (typeof HTMLElement.prototype.releasePointerCapture === "undefined") {
  HTMLElement.prototype.releasePointerCapture = function () {}
}
