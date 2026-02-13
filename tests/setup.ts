import "@testing-library/jest-dom"

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
