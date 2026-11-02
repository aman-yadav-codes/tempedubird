const fs = require('fs');

const filePath = 'lib/staff-documents.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize CRLF to LF for matching
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

const startIndex = content.indexOf('if (!staffUserId || !templateId || !renderedHtml || !title) {');
const endIndex = content.indexOf('currentUser.id,\n      ]\n    );', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const fullEnd = endIndex + 'currentUser.id,\n      ]\n    );'.length;
  const target = content.slice(startIndex, fullEnd);

  const replacement = `let finalInstitutionId = isPlatformAdmin
      ? Number(institutionId) || userInstId || 1
      : userInstId || Number(institutionId);

    if (!finalInstitutionId && staffUserId) {
      const userInstRes = await db.query<{ institution_id: number }>(
        \`SELECT institution_id FROM institution_memberships WHERE user_id = $1 AND is_active = TRUE LIMIT 1\`,
        [staffUserId]
      );
      finalInstitutionId = userInstRes.rows[0]?.institution_id || 1;
    }

    let finalTitle = title;
    let finalHtml = renderedHtml;
    let finalTemplateId = templateId || null;
    let finalFieldValues = fieldValues || {};

    if ((!finalHtml || !finalTitle) && (letterType === "salary_slip" || defaultDocType === "salary_slip" || body.month)) {
      const monthStr = body.month || new Date().toISOString().slice(0, 7);
      const [yearStr, monthNumStr] = monthStr.split("-");
      const monthDate = new Date(Number(yearStr), Number(monthNumStr) - 1, 1);
      const monthName = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      const staffRes = await db.query(\`
        SELECT u.id, u.full_name, u.email, u.phone,
               up.bank_name, up.account_holder_name, up.account_number, up.ifsc_code,
               up.pan_number, up.uan_number, up.esi_number, up.joining_date, up.shift_timing,
               COALESCE(r.name, 'Staff Member') as designation
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = $1 LIMIT 1
      \`, [staffUserId]);
      const staff = staffRes.rows[0] || { id: staffUserId, full_name: "Staff Member", email: "", designation: "Staff Member" };

      const instRes = await db.query(\`
        SELECT ip.id, ip.name, ip.logo_url, ip.address, ip.city, ip.state, ip.phone, ip.email
        FROM institution_profiles ip
        WHERE ip.id = $1 LIMIT 1
      \`, [finalInstitutionId || 1]);
      const inst = instRes.rows[0] || { name: "EduBird Academic Platform", address: "Central Campus", phone: "+91 98765 43210", email: "info@edubird.com" };

      let earnings = [];
      let deductionsList = [];

      if (Array.isArray(body.earnings) && body.earnings.length > 0) {
        earnings = body.earnings;
      }
      if (Array.isArray(body.deductions) && body.deductions.length > 0) {
        deductionsList = body.deductions;
      }

      if (earnings.length === 0 && deductionsList.length === 0) {
        const compRes = await db.query(\`
          SELECT component_name, amount, COALESCE(component_type, 'EARNING') as component_type
          FROM staff_salary_components
          WHERE user_id = $1
          ORDER BY sort_order ASC, id ASC
        \`, [staffUserId]);

        if (compRes.rows.length > 0) {
          compRes.rows.forEach((c) => {
            const amt = Number(c.amount) || 0;
            if (c.component_type === "DEDUCTION") {
              deductionsList.push({ name: c.component_name, amount: amt });
            } else {
              earnings.push({ name: c.component_name, amount: amt });
            }
          });
        } else {
          earnings = [
            { name: "Basic Salary", amount: 24000 },
            { name: "House Rent Allowance (HRA)", amount: 8000 },
            { name: "Conveyance Allowance", amount: 2500 },
            { name: "Special Allowance", amount: 3500 },
          ];
          deductionsList = [
            { name: "Provident Fund (EPF)", amount: 1800 },
            { name: "Professional Tax", amount: 200 },
            { name: "Health Insurance (ESI)", amount: 500 },
          ];
        }
      }

      const grossSalary = earnings.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalDeductions = deductionsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      finalTitle = \`Salary Slip - \${monthName} (\${staff.full_name})\`;

      finalFieldValues = {
        month: monthStr,
        month_name: monthName,
        staff_name: staff.full_name,
        designation: staff.designation,
        gross_salary: grossSalary,
        deductions: totalDeductions,
        net_salary: netSalary,
        earnings,
        deductions_list: deductionsList,
        bank_name: staff.bank_name || "N/A",
        account_number: staff.account_number ? \`XXXX-XXXX-\${staff.account_number.slice(-4)}\` : "N/A",
        ifsc_code: staff.ifsc_code || "N/A",
        pan_number: staff.pan_number || "N/A",
        uan_number: staff.uan_number || "N/A",
        notes: body.notes || "Salary disbursed via direct bank transfer.",
      };

      finalHtml = generateSalarySlipHtml({
        institution: inst,
        staff,
        monthName,
        earnings,
        deductionsList,
        grossSalary,
        totalDeductions,
        netSalary,
        notes: finalFieldValues.notes,
        generatedDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      });
    }

    if (!staffUserId || !finalHtml || !finalTitle) {
      return NextResponse.json(
        { error: "Staff member, title, and document content are required" },
        { status: 400 }
      );
    }

    const insertRes = await db.query(
      \`INSERT INTO staff_generated_letters (
         institution_id,
         staff_user_id,
         template_id,
         card_category_id,
         title,
         letter_type,
         rendered_html,
         field_values,
         image_url,
         pdf_url,
         canvas_width,
         canvas_height,
         generated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *\`,
      [
        finalInstitutionId || 1,
        staffUserId,
        finalTemplateId,
        cardCategoryId || null,
        finalTitle,
        letterType,
        finalHtml,
        JSON.stringify(finalFieldValues),
        imageUrl || null,
        pdfUrl || null,
        canvasWidth,
        canvasHeight,
        currentUser.id,
      ]
    );`;

  content = content.replace(target, replacement);
  if (isCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully replaced in lib/staff-documents.ts');
} else {
  console.log('Indices not found:', startIndex, endIndex);
}
