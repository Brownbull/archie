# Archie — Project Vision

**Project Name:** Archie (Architecture Simulator)
**Date:** 2026-02-09
**Creator:** Gabe

## One-Liner

A Factorio-inspired visual architecture simulator where developers snap together software building blocks, simulate load, and instantly see trade-offs in speed, cost, reliability, and complexity.

## Origin Story

Gabe encountered real pain building shared group features in Gastify/Voleta (personal finance app) — multi-user real-time data sharing was overengineered, caused latency and sync issues. Researching how WhatsApp/Telegram handle this revealed massive infrastructure with scaling costs. As a solopreneur, the gap between "what the giants do" and "what I can realistically adopt" is hard to navigate without visual, interactive tooling.

## Core Vision

A visual, interactive architecture simulator where users snap together software building blocks (databases, message queues, caching, CDNs, real-time protocols, etc.) and get immediate feedback on key metrics — speed, cost, replication, compatibility, scaling behavior. Users set priority constraints and get ranked architecture suggestions. Side-by-side comparison of trade-offs.

## Key Design Principles

1. **Architecture stats are STATIC/OBJECTIVE** — Components have fixed attributes regardless of who uses them. Player profile is a SEPARATE gap analysis layer.
2. **Three-Tab Toolbox** — Components | Stacks | Blueprints (explicit hierarchy, not fluid)
3. **Problem-first discovery** — Browse by challenge ("I have a latency problem") not just by technology type
4. **Open extensibility** — JSON/YAML config format for components, stacks, and blueprints. Community-shareable.
5. **Progression model** — Architectures exist on a progression ladder (solo → small team → enterprise). The tool shows where you are and what the next upgrade looks like.
6. **Safe sandbox** — You can't break anything. Experiment freely. All consequences are simulated.

## Target Users

- Solopreneurs building web applications
- Small development teams (2-5 people)
- Junior developers learning architecture
- Architects evaluating trade-offs quickly

## Visual Inspiration

- [Factorio](https://www.factorio.com/) — building blocks, progression, throughput visualization
- [Scratch (MIT)](https://scratch.mit.edu/) — snap-together visual blocks
- [AnimatedAI](https://animatedai.github.io/) — step-by-step animated flow visualization
- [LOOPY](https://ncase.me/loopy/) — systems thinking with circles and arrows, feedback loops
- Circuit simulators (LTSpice, Tinkercad) — "press play" simulation mode
