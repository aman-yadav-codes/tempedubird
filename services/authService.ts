// /services/authService.ts
import { createUser, getUserByEmail } from "@/models/userModel";
import { hashPassword, comparePassword } from "@/lib/auth/hash";
import { ACCOUNT_SUSPENDED_ERROR } from "@/lib/auth/suspension";
import { User } from "@/types/user";

import { saveUserPlainPassword } from "@/lib/queries/user-passwords";
import { db } from "@/lib/db/db";

import { getUserByPhoneQuery } from "@/lib/queries/user";
import { ensureAffiliateProfile, processAffiliateReferral } from "@/lib/queries/affiliates";

export const registerUser = async (
  data: User & {
    role_id?: number | null;
    role_code?: string | null;
    referral_code?: string | null;
    designation_id?: number | null;
    is_teacher?: boolean;
    teacher_type?: "individual_teacher" | "institute_teacher" | null;
    institution_id?: number | null;
    under_institution_id?: number | null;
  }
): Promise<User> => {
  const cleanEmail = data.email && data.email.trim().length > 0 ? data.email.trim().toLowerCase() : null;
  const cleanPhone = data.phone ? data.phone.trim() : null;

  if (cleanEmail) {
    const existing = await getUserByEmail(cleanEmail);
    if (existing) throw new Error("User exists");
  }

  if (cleanPhone) {
    const existingPhone = await getUserByPhoneQuery(db, cleanPhone);
    if (existingPhone) {
      throw new Error("Phone number already registered");
    }
  }

  const plainPassword = data.password;
  const hashed = await hashPassword(plainPassword);

  const user = await createUser({
    ...data,
    email: cleanEmail ?? undefined,
    phone: cleanPhone ?? undefined,
    password: hashed,
  });

  if (user?.id) {
    if (plainPassword) {
      await saveUserPlainPassword(db, user.id, plainPassword, user.email || cleanPhone || "", "signup");
    }

    // Auto-create affiliate record for this user (their mobile number is their affiliate code)
    try {
      await ensureAffiliateProfile(db, user.id, cleanPhone);
    } catch (affErr) {
      console.error("[registerUser] Failed to ensure affiliate profile:", affErr);
    }

    // Process referral code if provided
    if (data.referral_code && data.referral_code.trim().length > 0) {
      try {
        await processAffiliateReferral(db, {
          newUserId: user.id,
          referralCode: data.referral_code.trim(),
        });
      } catch (refErr) {
        console.error("[registerUser] Failed to process referral:", refErr);
      }
    }
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
