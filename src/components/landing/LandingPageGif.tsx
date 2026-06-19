import { useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { useGuestStore } from "@/stores/guestStore"
import { Button } from "@/components/ui/button"
import { Reveal } from "./Reveal"

/**
 * PREVIEW VARIANT of the landing (route: /gif). Same content as LandingPage, but it uses animated
 * GIFs instead of static screenshots — a looping app-in-motion GIF as a dimmed hero background, plus
 * GIF feature clips. Heavier than the screenshot landing (~8 MB of GIFs), so this is a "see how it
 * looks" comparison surface, not the production entry point.
 */
const MOTION = [
  {
    src: "/landing/gifs/build.gif",
    alt: "Placing components on the Archie canvas",
    title: "Build it",
    body: "Drop components onto the canvas and wire them together — the grade and cost update as you go.",
  },
  {
    src: "/landing/gifs/simulate.gif",
    alt: "A live Archie simulation with telemetry and a request-health timeline",
    title: "Run it under load",
    body: "Drive real traffic and watch latency, RPS, uptime and cost move in real time on the health timeline.",
  },
] as const

export function LandingPageGif() {
  const enterGuest = useGuestStore((s) => s.enterGuest)
  const navigate = useNavigate()

  const startGuest = () => {
    enterGuest()
    navigate("/app")
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-text-primary">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="font-mono text-lg font-bold tracking-tight text-text-primary drop-shadow">Archie</span>
          <span className="rounded-full border border-archie-accent/40 bg-archie-accent/10 px-2.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wide text-archie-accent-hover">
            GIF preview
          </span>
        </div>
      </header>

      {/* Hero with a looping app-in-motion GIF as a dimmed background */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden">
        <img
          src="/landing/gifs/hero.gif"
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Opaque dark wash so the foreground text stays readable over the motion */}
        <div aria-hidden className="absolute inset-0 bg-[#0f1117]/82" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 60% at 50% 45%, rgba(15,17,23,0.55) 0%, rgba(15,17,23,0.9) 100%), radial-gradient(50% 40% at 50% 30%, rgba(99,102,241,0.22), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-archie-accent-hover">
              Visual Architecture Simulator
            </span>
            <h1 className="mx-auto mt-5 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
              Design, score &amp; simulate{" "}
              <span className="bg-gradient-to-r from-archie-accent to-archie-accent-hover bg-clip-text text-transparent">
                software architecture
              </span>
              .
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Drag real components onto a canvas, get an objective grade, and run live traffic
              simulations with failure injection — right in your browser. No setup, no signup.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button data-testid="landing-guest-cta" size="lg" onClick={startGuest} className="group w-full sm:w-auto">
                Try it free — no login
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button data-testid="landing-signin-cta" size="lg" variant="outline" onClick={() => navigate("/login")} className="w-full sm:w-auto">
                Sign in
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* "See it in motion" — GIF feature clips */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-archie-accent-hover">
            See it in motion
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">The whole loop, live</h2>
          <p className="mt-4 text-text-secondary">Build it, then run real traffic through it.</p>
        </Reveal>

        <div className="mt-12 flex flex-col gap-16 sm:gap-24">
          {MOTION.map((m, i) => {
            const left = i % 2 === 0
            return (
              <div
                key={m.src}
                className={`grid items-center gap-8 lg:grid-cols-2 ${left ? "" : "lg:[&>*:first-child]:order-2"}`}
              >
                <Reveal direction={left ? "left" : "right"} className="relative">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-4 rounded-3xl opacity-50 blur-2xl"
                    style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.2), transparent 70%)" }}
                  />
                  <img
                    src={m.src}
                    alt={m.alt}
                    loading="lazy"
                    className="relative w-full rounded-xl border border-archie-border shadow-xl"
                  />
                </Reveal>
                <Reveal direction={left ? "right" : "left"} delay={90} className="max-w-md">
                  <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{m.title}</h3>
                  <p className="mt-4 leading-relaxed text-text-secondary">{m.body}</p>
                </Reveal>
              </div>
            )
          })}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal direction="scale">
          <div className="relative overflow-hidden rounded-2xl border border-archie-border bg-panel/60 px-6 py-16 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(99,102,241,0.16), transparent 70%)" }}
            />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start building in seconds</h2>
              <p className="mx-auto mt-4 max-w-xl text-text-secondary">
                No account needed — jump straight into the first quest and watch your architecture come to life.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button data-testid="landing-guest-cta-bottom" size="lg" onClick={startGuest} className="group w-full sm:w-auto">
                  Try it free — no login
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
                <button type="button" onClick={() => navigate("/login")} className="cursor-pointer text-sm text-text-secondary transition-colors hover:text-text-primary">
                  or sign in to save your progress
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-archie-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-text-secondary sm:flex-row">
          <span className="font-mono font-semibold text-text-primary">Archie</span>
          <span>Visual Architecture Simulator</span>
        </div>
      </footer>
    </div>
  )
}
