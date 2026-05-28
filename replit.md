# Bulk Inventory Manager

A full-stack chain-based email inventory resale platform for managing bulk email records, sales, reports, and settlements across a chain of sellers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/bulk-inventory run dev` — run the frontend (proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `MONGODB_URI` — MongoDB Atlas connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + MongoDB/Mongoose (NOT Drizzle/Postgres)
- Frontend: React + Vite + wouter + TanStack Query + shadcn/ui
- Auth: JWT (jsonwebtoken + bcryptjs), token stored in localStorage as "auth_token"
- API codegen: Orval (from OpenAPI spec in lib/api-spec)
- Generated hooks: in lib/api-client-react/src/generated/

## Where things live

- `artifacts/api-server/src/models/` — MongoDB/Mongoose models (User, Batch, InventoryRecord, Sale, Report, Settlement, Notification, Contact)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, users, contacts, batches, inventory, sales, reports, settlements, notifications, dashboard)
- `artifacts/api-server/src/lib/db.ts` — MongoDB connection (connectDB())
- `artifacts/api-server/src/lib/auth.ts` — JWT sign/verify + requireAuth middleware
- `artifacts/bulk-inventory/src/pages/` — All frontend pages
- `artifacts/bulk-inventory/src/components/layout/app-layout.tsx` — Sidebar + mobile nav
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks

## Architecture decisions

- MongoDB chosen over Postgres for flexible email record schemas and chain-of-custody lineage arrays
- JWT auth (not sessions) so the mobile-friendly frontend can store tokens in localStorage
- All routes use `requireAuth` middleware; role-based access checked per-route
- OpenAPI spec drives codegen — generated hooks used everywhere in frontend
- Generated hook naming: `useListX`, `useCreateX`, `useUpdateX`, `useDeleteX` (not `useGetX`/`usePostX`)

## Product

- **Bulk Upload**: paste any text and extract emails with duplicate detection (in-paste + in-inventory)
- **Batch Management**: organize inventory into named batches with expiry tracking
- **Sales**: sell inventory records to platform users or external contacts, track chain of custody
- **Reports & Replacements**: file reports on sold items, provide individual or bulk replacement emails
- **Refund Calculation**: pro-rated refunds based on days remaining
- **Dashboard**: real-time stats (inventory counts, expiry breakdown, revenue, recent activity)
- **Notifications**: in-app alerts for new sales, reports, replacements, and expiry warnings
- **Role-based access**: admin, bulk_seller, reseller, small_seller

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `pnpm --filter @workspace/db run push` does NOT apply here — this app uses MongoDB, not Postgres/Drizzle
- Generated hook names use verb-first convention: `useListBatches` NOT `useGetBatches`, `useCreateBatch` NOT `usePostBatches`
- Dashboard stats route uses `new mongoose.Types.ObjectId(userId)` for aggregation — must import mongoose
- Express 5: wildcard routes use `/{*splat}`, async handlers return `Promise<void>`, early returns use `res.json(); return;`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
