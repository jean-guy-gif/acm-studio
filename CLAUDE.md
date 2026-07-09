# CLAUDE.md

## Project

ACM Studio is a SaaS for real estate advisors.

Its purpose is to help advisors prepare and conduct interactive seller meetings in order to improve seller understanding and increase exclusive mandate conversion.

ACM Studio is not an automated valuation tool.

Never build features that estimate the seller property price automatically.

The advisor decides.  
The software prepares.  
The seller understands.

---

## Product architecture

ACM Studio has three main areas:

### Builder

Used before the seller meeting.

Purpose:

- create a project
- add the subject property
- import competitors
- review extracted data
- validate analysis
- prepare the meeting

### Live

Used during the seller meeting.

Purpose:

- display the interactive meeting sequence
- ask questions
- reveal competitor prices progressively
- record seller answers
- feed the perception engine

### Admin

Used for configuration.

Purpose:

- agencies
- users
- branding
- permissions
- templates
- billing later

---

## Core domain model

Use these exact terms in code:

- `Agency`
- `Advisor`
- `Project`
- `SubjectProperty`
- `Competitor`
- `Analysis`
- `Presentation`
- `Meeting`
- `SellerResponse`
- `Report`

Do not use:

- dossier
- bien principal
- comparable
- diaporama
- estimation

In user-facing French UI:

- Project = Dossier vendeur
- SubjectProperty = Votre bien
- Competitor = Concurrent
- Meeting = Rendez-vous vendeur
- Report = Rapport conseiller

---

## Absolute product rules

Never ask for the seller property price during project creation.

Never generate an automatic valuation.

Never show competitor price before asking the seller to guess it.

Never show several competitors on the same Live screen.

Never store business logic only in React components.

Never create fake data, fake photos, fake competitors, or fake sources.

Always keep advisor validation before final outputs.

Always distinguish seller-facing content from advisor-only content.

---

## Tech stack

Use:

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Supabase
- Supabase Auth
- Supabase Storage
- Zod
- React Hook Form
- OpenAI SDK
- PptxGenJS later
- Vitest
- Playwright

Avoid unless explicitly needed:

- Redux
- unnecessary global context
- complex state machines too early
- premature microservices

---

## Folder structure

Use this structure:

```txt
app/
components/
features/
lib/
services/
hooks/
types/
supabase/
docs/
tests/
public/
```

Feature-first structure:

```txt
features/projects/
features/competitors/
features/analysis/
features/meeting/
features/ipc/
features/reports/
features/branding/
```

Each feature may contain:

```txt
components/
actions/
schemas/
services/
types/
hooks/
tests/
```

---

## Coding rules

Use TypeScript everywhere.

Use Zod for validation.

Use server actions for mutations when appropriate.

Use Supabase clients from shared utilities.

Keep UI components small.

Keep business logic in services.

Prefer simple readable code over clever code.

Every new feature must include:

- types
- validation schema
- service/action
- UI component
- error handling
- tests where relevant

---

## Database rules

Supabase is the source of truth.

Every table must have:

- `id`
- `created_at`
- `updated_at` where relevant
- RLS enabled
- agency-based access control where relevant

Never create a table without RLS policy.

Never expose data across agencies.

Use soft delete when possible.

---

## AI rules

AI is an assistant, not a decision-maker.

AI may:

- extract competitor data
- summarize market data
- suggest market reading
- suggest advisor notes
- calculate perception indicators

AI must never:

- estimate the seller property
- invent missing data
- invent photos
- invent competitors
- bypass advisor validation

All AI outputs must be stored with traceability.

---

## Live meeting rules

Live is not a PowerPoint.

Live is an interactive meeting engine.

For each competitor, the sequence is:

1. Discover competitor without price
2. Ask seller if it is comparable
3. Ask seller to guess price
4. Reveal real price
5. Ask if price is coherent
6. Reveal time on market / price drop
7. Ask why it is still available

Every seller response must be stored.

Responses feed the perception engine.

---

## Definition of Done

A task is done only when:

- code builds
- TypeScript passes
- lint passes
- main user flow works
- errors are handled
- no fake business data is introduced
- naming respects the domain language
- security rules are respected
- UI is usable on desktop and tablet

---

## Development workflow

When implementing a task:

1. Read `CLAUDE.md`
2. Read `TASKS.md`
3. Read related docs in `/docs`
4. Implement only the requested task
5. Do not add unrelated features
6. Run checks
7. Summarize what changed
8. List remaining risks

---

## MVP priority

The MVP must only do this:

1. Create a Project
2. Add Subject Property
3. Import competitor data manually or from PDF
4. Validate competitors
5. Generate a basic meeting script
6. Run Live meeting
7. Capture seller responses
8. Produce advisor report

Everything else is V2.
