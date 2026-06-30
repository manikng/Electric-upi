---
name: electric-upi-frontend-architecture
description: 'Use when working in the Electric UPI Next.js + TypeScript codebase: exploring structure, adding features, designing routes, evolving the ORM/data layer, or enforcing Server-first / services-first conventions. Keywords: Electric UPI, App Router, listing, charger, booking, api route, service, ORM, migration, client server boundary.'
---

# Electric UPI Frontend Architecture — Project Skill

This skill keeps Copilot grounded in the actual Electric UPI codebase, not generic Next.js boilerplate. It encodes the repository’s real directory layout, data rules, and the “look-first” workflow so answers stay in sync with the code.

Use this skill before asserting anything about endpoints, components, data models, or folder locations in this repository.

## Workflow: Look-First (mandatory)

1. Before answering a repository question, search/read the relevant paths: `app/api`, `app/actions`, `lib`, `types`, `schema`, `components`, `hooks`, and `db/`.
2. If a file or route does not exist, state it explicitly and propose the exact path and contents instead of assuming defaults.
3. Ground every code reference in an actual file path and call out the line/section if possible.

## Canonical Project Map (repository-derived)

- `app/api` — REST/route handlers.
- `app/actions` — server-side actions.
- `app` — Next.js App Router pages and route segments.
- `components` — client UI components.
- `hooks` — client hooks.
- `lib` — infra (ORM client, helpers).
- `types` — shared types and client-safe DTOs.
- `db` / DB schema / migrations — data model source of truth.
- `public/styles` — static assets and styles.
- `tests` — unit/integration/e2e.

## Data Rules (project contracts)

- All data access must go through one routing layer: API routes or server actions.
- Use “safe” types for client boundaries; convert non-serializable values in the service/data layer before passing them to client components.
- The DB schema / migration layer is the source of truth for data shape; update provider docs when schema changes.
- Services should be small and focused; never call the ORM directly from UI or page code.

## Server-First Page Flow (generic pattern in this repo)

1. Browser requests a route.
2. Server component fetches via an API/service path.
3. Data returns as a client-safe serializable DTO.
4. Client component receives only serializable props and handles DOM interactions.

## Client/Server Boundary Rules (must-follow)

- Client components must declare `"use client"` when they use DOM APIs or client-only hooks.
- Prefer semantic navigation (`Link`) for routing; use direct client actions (POST to API routes / server actions) for state changes.
- Keep props minimal; use explicit callback props (`onX`) and boolean helper props (`isX`).

## Naming Conventions

- `use*` for client hooks.
- `on*` for event callbacks passed as props.
- `is*` / `has*` for boolean state.
- `Service` suffix for data-access modules in `lib` or `services`.
- Keep API/action naming consistent: nouns for resources (`/api/bookings`), verbs for actions.

## Reproducibility Expectations

When suggesting a change or debugging an issue, include:
- The affected file paths.
- The env vars or configs needed.
- Any migration/seed step required.
- Exact run/test commands.
- A minimal code patch.
