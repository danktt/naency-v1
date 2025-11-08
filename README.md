## Getting Started

Install dependencies and start the dev server with pnpm:

```bash
pnpm install
pnpm dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## Environment

Set the Neon connection string in `.env.local` (already added):

```
DATABASE_URL=postgres://...
```

## Database (Drizzle + Neon)

Drizzle is configured via `drizzle.config.ts` and leverages Neon through `src/server/db/client.ts`.

Common commands:

```bash
# Generate SQL migrations based on schema changes
pnpm db:generate

# Push the current schema directly to the database
pnpm db:push

# Explore and edit the database in a local web UI
pnpm db:studio
```

The default schema includes a `tasks` table in `src/server/db/schema.ts`. Update this file to evolve your data model.

## tRPC + TanStack Query

tRPC is exposed at `/api/trpc` through the App Router. The React Query client and providers are wired in `src/app/provider.tsx`.

Use the generated hooks anywhere in client components:

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

export function TaskList() {
  const { data } = trpc.task.list.useQuery();

  if (!data) return <p>Loading...</p>;

  return (
    <ul>
      {data.map((task) => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

Create new tasks with the mutation:

```tsx
const utils = trpc.useUtils();
const mutation = trpc.task.create.useMutation({
  onSuccess: () => utils.task.list.invalidate(),
});

mutation.mutate({ title: "My new task" });
```

Refer to `src/server/api/routers/task.ts` for more examples.
