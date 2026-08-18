// /lib/jwt.ts
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "secret";
const ACCESS_TOKEN_EXPIRES_IN = (process.env.ACCESS_TOKEN_EXPIRES_IN || "15m") as unknown as number;

export type AccessTokenClaims = {
  sub: string;
  id: number;
  sid?: string;
  typ: "access";
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, SECRET);
};

export const signAccessToken = (payload: object): string => {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

export const createAccessToken = (userId: number, sessionId?: string): string => {
  return signAccessToken({
    sub: String(userId),
    id: userId,
    sid: sessionId,
    typ: "access",
  } satisfies AccessTokenClaims);
};
