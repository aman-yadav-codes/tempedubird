// /services/authService.ts
import { createUser, getUserByEmail } from "@/models/userModel";
import { hashPassword, comparePassword } from "@/lib/auth/hash";
import { ACCOUNT_SUSPENDED_ERROR } from "@/lib/auth/suspension";
import { User } from "@/types/user";

import { saveUserPlainPassword } from "@/lib/queries/user-passwords";
import { db } from "@/lib/db/db";

export const registerUser = async (data: User): Promise<User> => {
  const existing = await getUserByEmail(data.email);
  if (existing) throw new Error("User exists");

  const plainPassword = data.password;
  const hashed = await hashPassword(plainPassword);

  const user = await createUser({
    ...data,
    password: hashed,
  });

  if (user?.id && plainPassword) {
    await saveUserPlainPassword(db, user.id, plainPassword, user.email, "signup");
  }

  return user;
};

export const loginUser = async (
  email: string,
  password: string
): Promise<{ user: User }> => {
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Invalid credentials");
  if (typeof user.password !== "string" || user.password.length === 0) {
    throw new Error("Invalid credentials");
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new Error("Invalid credentials");

  if (!user.id) throw new Error("Invalid user id");
  if (user.is_active === false) throw new Error(ACCOUNT_SUSPENDED_ERROR);

  return { user };
};
