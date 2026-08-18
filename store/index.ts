// store/index.ts
// Central export — import any store from "@/store"
//
// Examples:
//   import { useAuthStore } from "@/store"
//   import { useUIStore }   from "@/store"

export { useAuthStore } from "./slices/auth.store";
export { useUIStore } from "./slices/ui.store";
