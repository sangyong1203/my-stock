# myStock

Single-screen investment dashboard built with `Next.js`, `Auth.js`, `Drizzle`, `Neon`, `shadcn/ui`, and `Tailwind`.

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Database

Generate and apply migrations:

```bash
npm run db:generate
npm run db:migrate
```

## Structure

This project uses a domain-first structure.

- `src/app`
  Route entry points only. Keep pages and API routes thin.
- `src/features/<domain>/components`
  UI for that domain.
- `src/features/<domain>/actions`
  Next.js `use server` entry points. Parse input, call server logic, revalidate paths.
- `src/features/<domain>/server`
  Domain server logic: DB access, calculations, external API calls, persistence.
- `src/components/ui`
  Shared presentational UI primitives.
- `src/db`
  Drizzle schema and DB client.
- `src/lib`
  Cross-domain shared utilities only.

## Current domains

- `dashboard`
  Module registry, layout persistence, dashboard queries.
- `transactions`
  Trade create/update/delete and average-cost accounting.
- `market-data`
  Manual price snapshots, Finnhub sync, sync polling state.

## Rule of thumb

- If code belongs to one domain, keep it inside that feature.
- If code is reused across multiple domains, move it to `src/lib`.
