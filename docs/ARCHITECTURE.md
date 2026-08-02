# UMRAIO AI Sales Executive — Architecture v1.0

Tagline: AI Sales Executive For Umrah Agencies · Powered by Digital Renaissance Metaverse

---

## 1. Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR, server functions), Vite 7 |
| Styling | Tailwind CSS v4 + shadcn/ui, semantic oklch tokens in `src/styles.css` |
| State/Data | TanStack Query (loader `ensureQueryData` + `useSuspenseQuery`) |
| Backend | Lovable Cloud (Postgres, Auth, Storage, RLS) |
| AI | Lovable AI Gateway via AI SDK (`openai/gpt-5.6-sol`), streaming chat route |
| Messaging | WhatsApp Cloud API webhook → `/api/public/whatsapp` |
| Charts | Recharts | 
| Deploy | Cloudflare Workers (edge) |

Design language: dark-first, near-black surfaces, turquoise accent, white/gray text; Apple/Stripe/Linear restraint. No hardcoded color classes — all tokens.

---

## 2. Folder Structure

```text
src/
  routes/
    __root.tsx                 shell, providers, head defaults
    index.tsx                  marketing home (hero, product, pricing CTA)
    pricing.tsx  features.tsx  contact.tsx
    auth.tsx                   sign in / sign up
    reset-password.tsx
    _authenticated/
      route.tsx                auth gate (redirect to /auth)
      dashboard.tsx            KPIs, pipeline, AI activity
      inbox/index.tsx          conversation list
      inbox/$conversationId.tsx  live thread + AI takeover
      leads/index.tsx  leads/$leadId.tsx
      packages/index.tsx  packages/$packageId.tsx
      followups.tsx            sequences + queue
      ai/persona.tsx           AI persona, tone, guardrails
      ai/knowledge.tsx         knowledge base / docs
      analytics.tsx
      settings/agency.tsx  settings/team.tsx  settings/channels.tsx  settings/billing.tsx
    api/
      chat.ts                            streaming AI (useChat)
      public/whatsapp.ts                 inbound webhook (signature verified)
      public/cron-followups.ts           scheduled follow-up runner (secret header)
  components/
    ui/            shadcn primitives
    marketing/     Hero, LogoCloud, FeatureGrid, PricingTable, FAQ, Footer
    app/           AppShell, Sidebar, Topbar, PageHeader, EmptyState, DataTable
    inbox/         ConversationList, MessageBubble, Composer, AiSuggestion
    leads/         LeadCard, StageBadge, PipelineBoard, LeadDrawer
    packages/      PackageCard, PackageForm
    charts/        KpiCard, TrendChart, FunnelChart
  lib/
    *.functions.ts   client-callable server fns (leads, packages, agency, analytics)
    *.server.ts      server-only helpers (ai-gateway, whatsapp, scoring)
    query-options.ts, utils.ts
  hooks/           useAuth, useAgency, useMobile
  integrations/supabase/  generated client, types, auth middleware
supabase/migrations/
docs/ARCHITECTURE.md
```

---

## 3. Database Schema (Postgres, multi-tenant by `agency_id`)

Enums: `app_role(owner,admin,agent)`, `lead_stage(new,contacted,qualified,proposal,booked,lost)`, `channel(whatsapp,web,manual)`, `msg_sender(customer,ai,human)`, `followup_status(pending,sent,skipped,failed)`.

| Table | Key columns |
| --- | --- |
| `agencies` | id, name, slug, logo_url, country, timezone, plan, created_at |
| `profiles` | id → auth.users, agency_id, full_name, avatar_url, phone |
| `user_roles` | id, user_id, agency_id, role (separate table; `has_role()` security-definer) |
| `packages` | id, agency_id, name, city_pair, hotel_makkah, hotel_madinah, star_rating, nights, departure_date, airline, price_myr, inclusions[], is_active |
| `leads` | id, agency_id, full_name, phone, email, source, stage, score, budget_myr, pax, preferred_month, assigned_to, last_contact_at |
| `conversations` | id, agency_id, lead_id, channel, external_id, status, ai_enabled, last_message_at |
| `messages` | id, conversation_id, sender, body, parts jsonb, tokens, created_at |
| `ai_personas` | id, agency_id, name, tone, language, system_prompt, guardrails, is_active |
| `knowledge_docs` | id, agency_id, title, content, source_url, embedding vector(1536) |
| `followup_sequences` | id, agency_id, name, trigger_stage, steps jsonb, is_active |
| `followup_jobs` | id, agency_id, lead_id, sequence_id, step_index, run_at, status |
| `bookings` | id, agency_id, lead_id, package_id, pax, amount_myr, deposit_paid, status |
| `activity_log` | id, agency_id, actor, action, entity, entity_id, meta jsonb |
| `channel_configs` | id, agency_id, provider, phone_number_id, verified, secret_ref |

Every `CREATE TABLE` in `public` is followed by explicit `GRANT` to `authenticated` + `service_role` (anon only for public package listings), then `ENABLE ROW LEVEL SECURITY`, then policies. Core policy: rows visible only when `agency_id = current_agency_id()` (security-definer helper reading `profiles`); writes gated by `has_role(auth.uid(),'admin'|'owner')` for settings, billing, team.

---

## 4. Authentication Flow

1. Email + password via Lovable Cloud auth; optional Google sign-in later.
2. Signup collects full name + agency name → trigger creates `profiles` row; first user of a new agency gets `owner` in `user_roles`.
3. Email confirmation on by default; signup shows "check your email" state, session arrives via `onAuthStateChange`.
4. `useAuth` registers `onAuthStateChange` early; trusted checks use `getUser()`.
5. `/reset-password` public route handles `type=recovery` and calls `updateUser({password})`.
6. `_authenticated/route.tsx` gate redirects unauthenticated users to `/auth`; protected loaders live only under that subtree.
7. Server functions use `.middleware([requireSupabaseAuth])`; RLS enforces tenancy as the user. Service role only for webhook ingestion after signature verification.
8. Invites: owner/admin creates a pending `profiles` invite row scoped to the agency; role assignment always through `user_roles`.

---

## 5. Routing Map

Public: `/`, `/features`, `/pricing`, `/contact`, `/auth`, `/reset-password`
App: `/dashboard`, `/inbox`, `/inbox/:conversationId`, `/leads`, `/leads/:leadId`, `/packages`, `/packages/:packageId`, `/followups`, `/ai/persona`, `/ai/knowledge`, `/analytics`, `/settings/{agency,team,channels,billing}`
API: `POST /api/chat` (stream), `POST /api/public/whatsapp` (+ GET verify), `POST /api/public/cron-followups`

Each content route defines its own `head()` with unique title/description/og.

---

## 6. Component Architecture

- **AppShell**: collapsible sidebar (icon rail on tablet, sheet on mobile), topbar with agency switcher, search, AI status pill.
- **DataTable**: shared sortable/filterable table for leads, packages, bookings.
- **Inbox**: three-pane on desktop, stacked on mobile; per-conversation AI toggle, AI-suggested reply with human approve/edit/send.
- **AI layer**: server-side persona + retrieved knowledge + package catalog as tools (`recommend_packages`, `create_lead`, `schedule_followup`, `escalate_to_human`) with `stepCountIs(50)`.
- **Charts**: KPI cards (leads, reply rate, qualified, bookings, revenue MYR), funnel and trend charts.
- Loading = skeletons, errors = route `errorComponent` + `router.invalidate()`, empty states everywhere.

---

## 7. Future Scalability

- Multi-agency / multi-branch already modeled via `agency_id`; agency switcher ready.
- Channel abstraction (`channel_configs`) allows Instagram DM, Telegram, web widget, email without schema change.
- `knowledge_docs.embedding` enables pgvector RAG; swap models via gateway id only.
- Follow-up engine is data-driven (`steps jsonb`) — new sequence types need no deploy.
- Billing hooks: `agencies.plan` + usage metering table for per-message pricing (Stripe later).
- i18n-ready: Bahasa Malaysia / English persona language field; UI strings centralized.
- Audit trail via `activity_log`; role model supports finer permissions without migration risk.

---

## Next Step

Approve this architecture and I'll implement in order: design system + tokens → app shell + auth → dashboard/leads/packages → inbox + AI → follow-ups + analytics.
