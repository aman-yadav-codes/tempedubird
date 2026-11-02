const fs = require('fs');

const filePath = 'app/api/admin/users/[id]/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = 'export async function DELETE(';
const putCode = `export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const currentUser = await requireTargetUserPermission(req, userId);
    await assertCanAccessUser(currentUser, userId);

    const body = await req.json();

    // Handle salary account / notes update
    if (body.salary_account || body.salary_notes !== undefined) {
      const acc = body.salary_account || {};
      await db.query(\`
        INSERT INTO user_profiles (
          user_id, payment_mode, bank_name, account_holder_name, account_number,
          ifsc_code, branch_name, account_type, upi_id,
          pan_number, uan_number, esi_number, salary_notes, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          payment_mode = COALESCE(EXCLUDED.payment_mode, user_profiles.payment_mode),
          bank_name = EXCLUDED.bank_name,
          account_holder_name = EXCLUDED.account_holder_name,
          account_number = EXCLUDED.account_number,
          ifsc_code = EXCLUDED.ifsc_code,
          branch_name = EXCLUDED.branch_name,
          account_type = COALESCE(EXCLUDED.account_type, user_profiles.account_type),
          upi_id = EXCLUDED.upi_id,
          pan_number = EXCLUDED.pan_number,
          uan_number = EXCLUDED.uan_number,
          esi_number = EXCLUDED.esi_number,
          salary_notes = EXCLUDED.salary_notes,
          updated_at = NOW();
      \`, [
        userId,
        body.payment_mode || "BANK_TRANSFER",
        acc.bank_name || null,
        acc.account_holder_name || null,
        acc.account_number || null,
        acc.ifsc_code || null,
        acc.branch_name || null,
        acc.account_type || "SALARY",
        acc.upi_id || null,
        acc.pan_number || null,
        acc.uan_number || null,
        acc.esi_number || null,
        body.salary_notes !== undefined ? body.salary_notes : null,
      ]);

      const updatedUser = await getAdminUserDetails(db, userId);
      return NextResponse.json({ success: true, data: updatedUser });
    }

    // Fallback: parse through adminCreateUserSchema
    const parsed = adminCreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const roleMeta = await getRoleMeta(parsed.data.role_id ?? null);
    const userData = normalizeRoleProfile(parsed.data, roleMeta);
    const updatedUser = await updateAdminUserWithDetails(
      db,
      userId,
      userData,
      currentUser.id,
    );

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

`;

if (content.includes(target) && !content.includes('export async function PUT(')) {
  content = content.replace(target, putCode + target);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully added PUT handler to', filePath);
} else {
  console.log('Already added or target not found');
}

