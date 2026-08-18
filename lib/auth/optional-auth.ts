import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function getOptionalAuthenticatedUser(req: Request) {
  try {
    return await getAuthenticatedUser(req);
  } catch {
    return null;
  }
}
