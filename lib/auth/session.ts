// /lib/session.ts
import { cookies } from "next/headers";

export async function getSession(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("token")?.value;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("token");
}