// /types/user.ts
// The User type is now derived from the Zod schema — single source of truth.
// Import directly from here as before: import type { User } from "@/types/user"

export type { UserSchema as User } from "@/lib/validations";