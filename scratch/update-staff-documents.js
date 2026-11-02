const fs = require('fs');

const filePath = 'lib/staff-documents.ts';
let content = fs.readFileSync(filePath, 'utf8');

const helperCode = `
export function generateSalarySlipHtml({
  institution,
  staff,
  monthName,
  earnings,
  deductionsList,
  grossSalary,
  totalDeductions,
  netSalary,
  notes,
  generatedDate,
}: {
  institution: any;
  staff: any;
  monthName: string;
  earnings: { name: string; amount: number }[];
  deductionsList: { name: string; amount: number }[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  notes?: string;
  generatedDate: string;
}) {
  const maxRows = Math.max(earnings.length, deductionsList.length);
  const rowsHtml: string[] = [];

  for (let i = 0; i < maxRows; i++) {
    const earn = earnings[i];
    const ded = deductionsList[i];
    rowsHtml.push(\`
      <tr>
        <td style="padding: 9px 14px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">\${earn ? earn.name : ""}</td>
        <td style="padding: 9px 14px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 600; color: #0f172a;">\${earn ? "₹" + Number(earn.amount).toLocaleString("en-IN") : ""}</td>
        <td style="padding: 9px 14px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">\${ded ? ded.name : ""}</td>
        <td style="padding: 9px 14px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 600; color: #0f172a;">\${ded ? "₹" + Number(ded.amount).toLocaleString("en-IN") : ""}</td>
      </tr>
    \`);
  }

  return \`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Salary Slip - \${monthName} - \${staff.full_name}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; background: #fff !important; }
      .no-print { display: none !important; }
      .payslip-container { border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; }
    }
  </style>
</head>
<body style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px 12px; margin: 0; color: #0f172a;">
  <div class="payslip-container" style="max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); padding: 36px 40px; box-sizing: border-box;">
    
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px;">
      <div>
        <div style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">\${institution.name || "EduBird Educational Platform"}</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">\${institution.address || "Main Institutional Campus"}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
          \${institution.email ? "Email: " + institution.email : ""} \${institution.phone ? " | Tel: " + institution.phone : ""}
        </div>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; padding: 4px 12px; background: #e0f2fe; color: #0369a1; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Payslip / Salary Slip</span>
        <div style="font-size: 18px; font-weight: 800; color: #2563eb; margin-top: 6px;">\${monthName}</div>
      </div>
    </div>

    <!-- Employee Details Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; font-size: 13px;">
        <div><span style="color: #64748b; font-weight: 500;">Employee Name:</span> <strong style="color: #0f172a;">\${staff.full_name}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">Designation / Role:</span> <strong style="color: #0f172a;">\${staff.designation || "Staff Member"}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">Employee ID:</span> <strong style="color: #0f172a;">EMP-\${staff.id}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">Joining Date:</span> <strong style="color: #0f172a;">\${staff.joining_date ? new Date(staff.joining_date).toLocaleDateString('en-IN') : "N/A"}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">Bank Name:</span> <strong style="color: #0f172a;">\${staff.bank_name || "N/A"}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">Account Number:</span> <strong style="color: #0f172a;">\${staff.account_number ? "XXXX-XXXX-" + staff.account_number.slice(-4) : "N/A"}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">IFSC Code:</span> <strong style="color: #0f172a;">\${staff.ifsc_code || "N/A"}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">PAN Number:</span> <strong style="color: #0f172a;">\${staff.pan_number || "N/A"}</strong></div>
      </div>
    </div>

    <!-- Salary Breakdown Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f1f5f9; text-align: left;">
          <th style="padding: 10px 14px; border: 1px solid #cbd5e1; width: 35%; font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase;">Earnings</th>
          <th style="padding: 10px 14px; border: 1px solid #cbd5e1; width: 15%; font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; text-align: right;">Amount (₹)</th>
          <th style="padding: 10px 14px; border: 1px solid #cbd5e1; width: 35%; font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase;">Deductions</th>
          <th style="padding: 10px 14px; border: 1px solid #cbd5e1; width: 15%; font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        \${rowsHtml.join("")}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: 800;">
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 13px; color: #0f172a;">Total Gross Earnings</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 13px; text-align: right; color: #16a34a;">₹\${grossSalary.toLocaleString("en-IN")}</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 13px; color: #0f172a;">Total Deductions</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 13px; text-align: right; color: #dc2626;">₹\${totalDeductions.toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Net Payable Box -->
    <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <div style="font-size: 11px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px;">Net Salary Payable</div>
        <div style="font-size: 12px; color: #166534; margin-top: 3px;">Payment via Direct Bank Transfer</div>
      </div>
      <div style="font-size: 26px; font-weight: 900; color: #15803d;">
        ₹\${netSalary.toLocaleString("en-IN")}
      </div>
    </div>

    \${notes ? \`<div style="font-size: 12px; color: #64748b; margin-bottom: 24px; font-style: italic;">Note: \${notes}</div>\` : ""}

    <!-- Footer Signatures -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 36px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #64748b;">
      <div>
        <div>Generated Date: \${generatedDate}</div>
        <div style="margin-top: 2px;">This is a system generated document and does not require a physical signature.</div>
      </div>
      <div style="text-align: center;">
        <div style="border-bottom: 1.5px solid #0f172a; width: 170px; margin-bottom: 6px;"></div>
        <div style="font-weight: 700; color: #0f172a;">Authorized Signatory</div>
      </div>
    </div>

  </div>
</body>
</html>\`;
}
`;

// Insert helperCode before export async function handleDocumentPost
content = content.replace('export async function handleDocumentPost(', helperCode + '\nexport async function handleDocumentPost(');

// Add handleDocumentPut
const putFunction = `
export async function handleDocumentPut(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const isInstitutionAdmin = isInstitutionAdminUser(currentUser);

    if (!isPlatformAdmin && !isInstitutionAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, renderedHtml, fieldValues } = body;

    if (!id) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    const res = await db.query(
      \`UPDATE staff_generated_letters
       SET title = COALESCE($1, title),
           rendered_html = COALESCE($2, rendered_html),
           field_values = COALESCE($3::jsonb, field_values),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *\`,
      [title || null, renderedHtml || null, fieldValues ? JSON.stringify(fieldValues) : null, id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error) {
    console.error("[STAFF_DOCUMENTS_PUT]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update document" },
      { status: 500 }
    );
  }
}
`;

content += putFunction;

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated lib/staff-documents.ts with helper and PUT handler');

