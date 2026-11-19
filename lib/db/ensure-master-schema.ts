import { db } from "@/lib/db/db";

export async function ensureMasterDataSchema(): Promise<void> {
  // Schema is managed via migrations (scripts/migrate-master-data.mjs)
  return Promise.resolve();
}
