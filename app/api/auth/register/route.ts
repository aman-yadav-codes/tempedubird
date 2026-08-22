// /app/api/auth/register/route.ts
import { registerUser } from "@/services/authService";
import { registerSchema } from "@/lib/validations";

function getRegisterErrorStatus(message: string) {
  if (message === "Platform admin role can only be assigned from the admin panel") return 403;
  if (message === "Invalid signup role") return 400;
  if (message === "Select an institution for this signup role") return 400;
  if (message === "Designation is only allowed for Institution Admin role") return 422;
  if (message === "Select a designation for this signup role") return 422;
  if (message === "User exists" || message === "Phone number already registered") return 409;
  return 500;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Zod validation — returns field-level errors on bad input
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    // confirmPassword is only for client-side; strip before passing to service
    const { confirmPassword: _, ...userData } = parsed.data;
    await registerUser(userData);

    return Response.json({ message: "User registered successfully" }, { status: 201 });
  } catch (err: any) {
    const message = err?.message || "Registration failed";
    return Response.json({ error: message }, { status: getRegisterErrorStatus(message) });
  }
}
