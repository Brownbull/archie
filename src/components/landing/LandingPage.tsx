import { Navigate, useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useGuestStore } from "@/stores/guestStore"
import { Button } from "@/components/ui/button"
import { Reveal } from "./Reveal"
import { useParallax } from "./useParallax"

// Custom pixel-art icons (PixelLab, 64×64, no background) — the same visual language as Archie's
// in-app component icons. Rendered with image-rendering: pixelated so they stay crisp when scaled.
const FEATURES = [
  {
    icon: "/landing/icons/01-components.png",
    title: "116 real components",
    body: "AWS, Postgres, Kafka, Redis, CDNs, LLM gateways and more — drag them onto the canvas and wire them together.",
  },
  {
    icon: "/landing/icons/02-scoring.png",
    title: "Objective scoring",
    body: "Every build is graded across performance, reliability, scalability, cost and operations. No hand-waving.",
  },
  {
    icon: "/landing/icons/03-simulation.png",
    title: "Live simulation",
    body: "Drive real traffic and watch latency, RPS, uptime and cost move in real time. Inject failures and see what breaks.",
  },
  {
    icon: "/landing/icons/04-ai-import.png",
    title: "AI prompt → import",
    body: "Ask any LLM for an architecture in Archie's format, import the YAML, and get it scored in seconds.",
  },
  {
    icon: "/landing/icons/05-quests.png",
    title: "Quest curriculum",
    body: "Learn by building — 64 guided quests across 7 tracks, from your First Service all the way to scale-out.",
  },
  {
    icon: "/landing/icons/06-zero-setup.png",
    title: "Zero setup",
    body: "Runs entirely in your browser. Nothing to install, and no account required to start.",
  },
] as const

const SHOTS = [
  {
    src: "/landing/02-inspector-scoring.webp",
    alt: "Archie inspector showing per-component metrics, costs and gains alongside the overall grade",
    title: "Understand every trade-off",
    body: "Per-component metrics, costs and gains — see exactly why your grade is what it is, and what to change.",
  },
  {
    src: "/landing/03-simulation-running.webp",
    alt: "Archie running a live simulation with telemetry stats and a request-health timeline",
    title: "Watch it under load",
    body: "Live telemetry and a request-health timeline. Run failure scenarios and prove your architecture holds — or find out where it doesn't.",
  },
] as const

export function LandingPage() {
  const { user } = useAuth()
  const isGuest = useGuestStore((s) => s.isGuest)
  const enterGuest = useGuestStore((s) => s.enterGuest)
  const navigate = useNavigate()
  const heroShot = useParallax<HTMLImageElement>(0.05)

  // Returning users (or an in-progress guest) skip the marketing page and go straight to the app.
  if (user || isGuest) return <Navigate to="/app" replace />

  const startGuest = () => {
    enterGuest()
    navigate("/app")
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-text-primary">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-archie-border/60 bg-[#0f1117]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="font-mono text-lg font-bold tracking-tight text-text-primary">Archie</span>
          <button
            type="button"
            data-testid="landing-signin-top"
            onClick={() => navigate("/login")}
            className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* indigo glow + dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0) 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(rgba(129,140,248,0.18) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(70% 55% at 50% 25%, #000 0%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(70% 55% at 50% 25%, #000 0%, transparent 80%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 text-center sm:pt-28">
          <Reveal>
            <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-archie-accent-hover">
              Visual Architecture Simulator
            </span>
            <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
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
              <Button
                data-testid="landing-guest-cta"
                size="lg"
                onClick={startGuest}
                className="group w-full sm:w-auto"
              >
                Try it free — no login
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button
                data-testid="landing-signin-cta"
                size="lg"
                variant="outline"
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto"
              >
                Sign in
              </Button>
            </div>
          </Reveal>

          {/* Hero product shot */}
          <Reveal delay={120} className="mt-14">
            <div className="relative mx-auto max-w-5xl">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 rounded-3xl opacity-60 blur-2xl"
                style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.25), transparent 70%)" }}
              />
              <img
                ref={heroShot}
                src="/landing/01-architecture-canvas.webp"
                alt="An architecture built in Archie — connected components on a canvas with a build-health checklist, an overall grade and a cost estimate"
                width={1600}
                height={1000}
                loading="eager"
                className="relative w-full rounded-xl border border-archie-border shadow-2xl"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Features — bento grid */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-archie-accent-hover">
            What you get
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            The whole loop, in one canvas
          </h2>
          <p className="mt-4 text-text-secondary">
            Build it, grade it, run it under load — then learn why it scores the way it does.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 110} direction="up">
              <div className="group h-full rounded-xl border border-archie-border bg-panel/60 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-archie-accent/60">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg border border-archie-border bg-surface transition-colors group-hover:border-archie-accent/60">
                  <img
                    src={f.icon}
                    alt=""
                    aria-hidden
                    width={64}
                    height={64}
                    loading="lazy"
                    className="h-10 w-10"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold text-text-primary">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Screenshot showcase — alternating */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="flex flex-col gap-16 sm:gap-24">
          {SHOTS.map((s, i) => {
            // Alternate sides; each half slides in from its own side as the row scrolls into view.
            const imgOnLeft = i % 2 === 0
            return (
              <div
                key={s.src}
                className={`grid items-center gap-8 lg:grid-cols-2 ${imgOnLeft ? "" : "lg:[&>*:first-child]:order-2"}`}
              >
                <Reveal direction={imgOnLeft ? "left" : "right"} className="relative">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-4 rounded-3xl opacity-50 blur-2xl"
                    style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.2), transparent 70%)" }}
                  />
                  <img
                    src={s.src}
                    alt={s.alt}
                    width={1600}
                    height={1000}
                    loading="lazy"
                    className="relative w-full rounded-xl border border-archie-border shadow-xl"
                  />
                </Reveal>
                <Reveal direction={imgOnLeft ? "right" : "left"} delay={90} className="max-w-md">
                  <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{s.title}</h3>
                  <p className="mt-4 leading-relaxed text-text-secondary">{s.body}</p>
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
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="cursor-pointer text-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  or sign in to save your progress
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-archie-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-text-secondary sm:flex-row">
          <span className="font-mono font-semibold text-text-primary">Archie</span>
          <span>Visual Architecture Simulator</span>
        </div>
      </footer>
    </div>
  )
}
