import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in the environment");
}

const queryClient = neon(connectionString);

export const db = drizzle({
  client: queryClient,
  schema,
});

export type DbClient = typeof db;

