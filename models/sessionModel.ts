// /models/sessionModel.ts
import { db } from "@/lib/db/db";
import {
  insertSession,
  getSessionById,
  deleteSessionById,
} from "@/lib/queries/session";

export const createSession = async (
  id: string,
  userId: number,
  userAgent: string,
  ip: string
) => {
  return insertSession(db, id, userId, userAgent, ip);
};

export const getSession = async (id: string) => {
  return getSessionById(db, id);
};

export const deleteSession = async (id: string) => {
  return deleteSessionById(db, id);
};