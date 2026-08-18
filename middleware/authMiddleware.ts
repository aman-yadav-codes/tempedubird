// /middleware/authMiddleware.ts
import { verifyToken } from "@/lib/auth/jwt";
import { getSession } from "@/lib/auth/session";

export const requireAuth = async () => {
  const token = await getSession();

  if (!token) throw new Error("Unauthorized");

  return verifyToken(token);
};