import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

// Document configuration types
export type DocumentConfig = {
  type: string;
  categorySlug: string;
  categoryName: string;
  defaultTemplateName: string;
  defaultTemplateHtml: string;
  fields: { field_name: string; label: string; field_type: string; is_required: boolean; sort_order: number }[];
};

export const DOCUMENT_CONFIGS: Record<string, DocumentConfig> = {
  experience_letter: {
    type: "experience_letter",
    categorySlug: "experience-letter",
    categoryName: "Experience Letter - Staff",
    defaultTemplateName: "Classic Executive Experience Letter",
    defaultTemplateHtml: `
<div style="width: 794px; min-height: 1080px; padding: 50px 60px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #ffffff; box-sizing: border-box; line-height: 1.6; position: relative;">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 25px;">
    <div style="max-width: 600px;">
      <h1 style="margin: 0; font-size: 23px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">{{institutionName}}</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">{{institutionAddress}}</p>
    </div>
    <div style="width: 65px; height: 65px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #e2e8f0; shrink-0;">
      <img src="{{institutionLogo}}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
    </div>
  </div>
  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 28px;">
    <div>Ref: {{referenceNumber}}</div>
    <div>Date: {{issueDate}}</div>
  </div>
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #0f172a; text-decoration: underline; text-underline-offset: 6px;">
      Experience &amp; Relieving Certificate
    </h2>
    <p style="margin: 8px 0 0 0; font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 1px;">TO WHOM IT MAY CONCERN</p>
  </div>
  <div style="font-size: 14px; color: #334155; line-height: 1.8; text-align: justify;">
    <p style="margin-bottom: 16px;">
      This is to certify that <strong>{{employeeName}}</strong> (Employee Code: <strong>{{employeeCode}}</strong>) was employed with <strong>{{institutionName}}</strong> in the capacity of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department from <strong>{{joiningDate}}</strong> to <strong>{{relievingDate}}</strong>.
    </p>
    <p style="margin-bottom: 16px;">
      During their tenure with us, <strong>{{employeeName}}</strong> demonstrated exceptional commitment, professional expertise, and sincere diligence in executing all assigned duties and responsibilities. Their contributions were highly valuable to the operational standards of our organization.
    </p>
    <p style="margin-bottom: 20px;">
      Their conduct and character during the service period were found to be <strong>{{conductAssessment}}</strong>. They have been officially relieved from their duties with effect from <strong>{{relievingDate}}</strong> after completing all official handover formalities.
    </p>
    <p style="margin-bottom: 35px;">
      We appreciate their dedicated service to <strong>{{institutionName}}</strong> and extend our best wishes for their future career growth and success.
    </p>
  </div>
  <div style="margin-top: 45px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 45px;">Authorized Signature &amp; Official Seal</div>
      <div style="font-size: 15px; font-weight: 700; color: #0f172a;">{{signatoryName}}</div>
      <div style="font-size: 13px; color: #475569;">{{signatoryDesignation}}</div>
      <div style="font-size: 12px; color: #64748b; font-weight: 600;">{{institutionName}}</div>
    </div>
    <div style="border: 2px dashed #cbd5e1; border-radius: 50%; width: 85px; height: 85px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; text-align: center; text-transform: uppercase; font-weight: 700;">
      Official<br/>Seal
    </div>
  </div>
  <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px;">
    This is a verified document issued from the official records of {{institutionName}}.
  </div>
</div>`,
    fields: [
      { field_name: "institutionName", label: "Institution Name", field_type: "text", is_required: true, sort_order: 0 },
      { field_name: "institutionLogo", label: "Institution Logo", field_type: "image", is_required: false, sort_order: 1 },
      { field_name: "institutionAddress", label: "Institution Address", field_type: "text", is_required: true, sort_order: 2 },
      { field_name: "institutionEmail", label: "Official Email", field_type: "email", is_required: false, sort_order: 3 },
      { field_name: "institutionPhone", label: "Official Phone", field_type: "phone", is_required: false, sort_order: 4 },
      { field_name: "issueDate", label: "Issue Date", field_type: "date", is_required: true, sort_order: 5 },
      { field_name: "referenceNumber", label: "Reference Number", field_type: "text", is_required: true, sort_order: 6 },
      { field_name: "employeeName", label: "Employee Name", field_type: "text", is_required: true, sort_order: 7 },
      { field_name: "employeeCode", label: "Employee Code / ID", field_type: "text", is_required: true, sort_order: 8 },
      { field_name: "designation", label: "Designation / Role", field_type: "text", is_required: true, sort_order: 9 },
      { field_name: "department", label: "Department", field_type: "text", is_required: true, sort_order: 10 },
      { field_name: "joiningDate", label: "Date of Joining", field_type: "date", is_required: true, sort_order: 11 },
      { field_name: "relievingDate", label: "Date of Relieving", field_type: "date", is_required: true, sort_order: 12 },
      { field_name: "conductAssessment", label: "Conduct Assessment", field_type: "text", is_required: true, sort_order: 13 },
      { field_name: "signatoryName", label: "Signatory Name", field_type: "text", is_required: true, sort_order: 14 },
      { field_name: "signatoryDesignation", label: "Signatory Designation", field_type: "text", is_required: true, sort_order: 15 },
    ],
  },

  offer_letter: {
    type: "offer_letter",
    categorySlug: "offer-letter",
    categoryName: "Offer Letter - Staff",
    defaultTemplateName: "Official Faculty & Staff Employment Offer",
    defaultTemplateHtml: `
<div style="width: 794px; min-height: 1080px; padding: 50px 60px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #ffffff; box-sizing: border-box; line-height: 1.6; position: relative;">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 25px;">
    <div style="max-width: 600px;">
      <h1 style="margin: 0; font-size: 23px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">{{institutionName}}</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">{{institutionAddress}}</p>
    </div>
    <div style="width: 65px; height: 65px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #e2e8f0; shrink-0;">
      <img src="{{institutionLogo}}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
    </div>
  </div>
  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 25px;">
    <div>Ref: {{referenceNumber}}</div>
    <div>Date: {{issueDate}}</div>
  </div>
  <div style="margin-bottom: 20px;">
    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">To,</div>
    <div style="font-size: 15px; font-weight: 800; color: #2563eb;">{{employeeName}}</div>
    <div style="font-size: 13px; color: #64748b;">Email: {{employeeEmail}} | Phone: {{employeePhone}}</div>
  </div>
  <div style="text-align: center; margin-bottom: 25px;">
    <h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; text-decoration: underline; text-underline-offset: 5px;">
      Letter of Employment Offer &amp; Appointment
    </h2>
    <p style="margin: 6px 0 0 0; font-size: 12px; font-weight: 700; color: #2563eb;">Position: {{designation}}</p>
  </div>
  <div style="font-size: 13.5px; color: #334155; line-height: 1.7; text-align: justify;">
    <p style="margin-bottom: 14px;">
      Dear <strong>{{employeeName}}</strong>,
    </p>
    <p style="margin-bottom: 14px;">
      On behalf of <strong>{{institutionName}}</strong>, we are delighted to offer you the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department. Following your performance in our evaluation and interview process, we are confident in the expertise and values you will contribute to our institution.
    </p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 20px; margin: 16px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
        <div><strong>Designation:</strong> {{designation}}</div>
        <div><strong>Department:</strong> {{department}}</div>
        <div><strong>Date of Joining:</strong> {{joiningDate}}</div>
        <div><strong>Reporting Manager:</strong> {{reportingManager}}</div>
        <div><strong>Monthly Salary:</strong> {{monthlySalary}}</div>
        <div><strong>Annual CTC:</strong> {{annualCTC}}</div>
      </div>
    </div>
    <p style="margin-bottom: 14px;">
      Please confirm your acceptance of this offer by signing and returning a copy of this letter on or before <strong>{{offerValidUntil}}</strong>. Upon joining, you will be briefed on institution policies, benefits, and statutory guidelines.
    </p>
    <p style="margin-bottom: 25px;">
      We look forward to welcoming you to our team and wish you a rewarding career with <strong>{{institutionName}}</strong>.
    </p>
  </div>
  <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 40px;">Authorized Signature</div>
      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">{{signatoryName}}</div>
      <div style="font-size: 12px; color: #475569;">{{signatoryDesignation}}</div>
      <div style="font-size: 12px; color: #64748b;">{{institutionName}}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 40px;">Candidate Acceptance Signature</div>
      <div style="font-size: 13px; font-weight: 700; color: #0f172a;">{{employeeName}}</div>
      <div style="font-size: 11px; color: #94a3b8;">Date: __________________</div>
    </div>
  </div>
  <div style="margin-top: 35px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
    Official Offer of Employment — {{institutionName}}
  </div>
</div>`,
    fields: [
      { field_name: "institutionName", label: "Institution Name", field_type: "text", is_required: true, sort_order: 0 },
      { field_name: "institutionLogo", label: "Institution Logo", field_type: "image", is_required: false, sort_order: 1 },
      { field_name: "institutionAddress", label: "Institution Address", field_type: "text", is_required: true, sort_order: 2 },
      { field_name: "referenceNumber", label: "Reference Number", field_type: "text", is_required: true, sort_order: 3 },
      { field_name: "issueDate", label: "Issue Date", field_type: "date", is_required: true, sort_order: 4 },
      { field_name: "employeeName", label: "Candidate Name", field_type: "text", is_required: true, sort_order: 5 },
      { field_name: "employeeEmail", label: "Candidate Email", field_type: "email", is_required: false, sort_order: 6 },
      { field_name: "employeePhone", label: "Candidate Phone", field_type: "phone", is_required: false, sort_order: 7 },
      { field_name: "designation", label: "Offered Designation", field_type: "text", is_required: true, sort_order: 8 },
      { field_name: "department", label: "Department", field_type: "text", is_required: true, sort_order: 9 },
      { field_name: "joiningDate", label: "Date of Joining", field_type: "date", is_required: true, sort_order: 10 },
      { field_name: "offerValidUntil", label: "Offer Valid Until", field_type: "date", is_required: true, sort_order: 11 },
      { field_name: "monthlySalary", label: "Monthly Gross Salary", field_type: "text", is_required: true, sort_order: 12 },
      { field_name: "annualCTC", label: "Annual CTC", field_type: "text", is_required: true, sort_order: 13 },
      { field_name: "reportingManager", label: "Reporting Manager / Head", field_type: "text", is_required: true, sort_order: 14 },
      { field_name: "signatoryName", label: "Signatory Name", field_type: "text", is_required: true, sort_order: 15 },
      { field_name: "signatoryDesignation", label: "Signatory Designation", field_type: "text", is_required: true, sort_order: 16 },
    ],
  },

  salary_slip: {
    type: "salary_slip",
    categorySlug: "salary-slip",
    categoryName: "Salary Slip - Staff",
    defaultTemplateName: "Standard Monthly Staff Salary Slip",
    defaultTemplateHtml: `
<div style="width: 794px; min-height: 1080px; padding: 45px 55px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #ffffff; box-sizing: border-box; line-height: 1.5; position: relative;">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
    <div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">{{institutionName}}</h1>
      <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b;">{{institutionAddress}}</p>
    </div>
    <div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #e2e8f0;">
      <img src="{{institutionLogo}}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 22px;">
    <h2 style="margin: 0; font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #2563eb;">
      Payslip For The Month of {{payMonth}} {{payYear}}
    </h2>
  </div>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 12px;">
      <div><span style="color: #64748b;">Employee Name:</span> <strong style="color: #0f172a;">{{employeeName}}</strong></div>
      <div><span style="color: #64748b;">Employee ID:</span> <strong>{{employeeCode}}</strong></div>
      <div><span style="color: #64748b;">Designation:</span> <strong>{{designation}}</strong></div>
      <div><span style="color: #64748b;">Department:</span> <strong>{{department}}</strong></div>
      <div><span style="color: #64748b;">Bank Name:</span> <strong>{{bankName}}</strong></div>
      <div><span style="color: #64748b;">Account No:</span> <strong>{{accountNumber}}</strong></div>
      <div><span style="color: #64748b;">Payment Mode:</span> <strong>{{paymentMode}}</strong></div>
      <div><span style="color: #64748b;">Pay Period:</span> <strong>{{payMonth}} {{payYear}}</strong></div>
      <div><span style="color: #64748b;">Generated On:</span> <strong>{{issueDate}}</strong></div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #eff6ff; padding: 8px 12px; font-size: 13px; font-weight: 700; color: #1d4ed8; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
        <span>Earnings</span>
        <span>Amount (₹)</span>
      </div>
      <div style="padding: 10px 12px; font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between;"><span>Basic Salary</span> <span>{{basicSalary}}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>HRA (House Rent)</span> <span>{{hraAllowance}}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>Dearness Allowance (DA)</span> <span>{{daAllowance}}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>Special / Other Allowance</span> <span>{{specialAllowance}}</span></div>
      </div>
      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 8px 12px; font-size: 12.5px; font-weight: 700; display: flex; justify-content: space-between;">
        <span>Total Gross Earnings:</span>
        <span style="color: #16a34a;">{{grossSalary}}</span>
      </div>
    </div>

    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #fef2f2; padding: 8px 12px; font-size: 13px; font-weight: 700; color: #b91c1c; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
        <span>Deductions</span>
        <span>Amount (₹)</span>
      </div>
      <div style="padding: 10px 12px; font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between;"><span>Provident Fund (PF)</span> <span>{{pfDeduction}}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>Professional Tax / TDS</span> <span>{{taxDeduction}}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>Other Deductions</span> <span>₹0.00</span></div>
      </div>
      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 8px 12px; font-size: 12.5px; font-weight: 700; display: flex; justify-content: space-between;">
        <span>Total Deductions:</span>
        <span style="color: #dc2626;">{{totalDeductions}}</span>
      </div>
    </div>
  </div>

  <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px;">
    <div>
      <div style="font-size: 12px; color: #15803d; font-weight: 600; text-transform: uppercase;">Net Payable Salary</div>
      <div style="font-size: 11px; color: #64748b;">(Gross Earnings - Total Deductions)</div>
    </div>
    <div style="font-size: 24px; font-weight: 800; color: #15803d;">{{netSalary}}</div>
  </div>

  <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 40px;">Authorized Signatory / Accounts</div>
      <div style="font-size: 13px; font-weight: 700; color: #0f172a;">{{signatoryName}}</div>
      <div style="font-size: 11px; color: #64748b;">{{signatoryDesignation}}</div>
    </div>
    <div style="border: 2px dashed #cbd5e1; border-radius: 50%; width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; text-align: center; text-transform: uppercase; font-weight: 700;">
      Paid &amp;<br/>Verified
    </div>
    <div style="text-align: right;">
      <div style="font-size: 11px; color: #64748b; margin-bottom: 40px;">Employee Signature</div>
      <div style="font-size: 13px; font-weight: 700; color: #0f172a;">{{employeeName}}</div>
    </div>
  </div>

  <div style="margin-top: 35px; text-align: center; font-size: 10.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
    Computer generated salary slip. No manual signature required if electronically authenticated.
  </div>
</div>`,
    fields: [
      { field_name: "institutionName", label: "Institution Name", field_type: "text", is_required: true, sort_order: 0 },
      { field_name: "institutionLogo", label: "Institution Logo", field_type: "image", is_required: false, sort_order: 1 },
      { field_name: "institutionAddress", label: "Institution Address", field_type: "text", is_required: true, sort_order: 2 },
      { field_name: "payMonth", label: "Pay Month", field_type: "text", is_required: true, sort_order: 3 },
      { field_name: "payYear", label: "Pay Year", field_type: "text", is_required: true, sort_order: 4 },
      { field_name: "issueDate", label: "Generated Date", field_type: "date", is_required: true, sort_order: 5 },
      { field_name: "employeeName", label: "Employee Name", field_type: "text", is_required: true, sort_order: 6 },
      { field_name: "employeeCode", label: "Employee Code / ID", field_type: "text", is_required: true, sort_order: 7 },
      { field_name: "designation", label: "Designation", field_type: "text", is_required: true, sort_order: 8 },
      { field_name: "department", label: "Department", field_type: "text", is_required: true, sort_order: 9 },
      { field_name: "basicSalary", label: "Basic Salary (₹)", field_type: "text", is_required: true, sort_order: 10 },
      { field_name: "hraAllowance", label: "HRA (₹)", field_type: "text", is_required: true, sort_order: 11 },
      { field_name: "daAllowance", label: "DA Allowance (₹)", field_type: "text", is_required: false, sort_order: 12 },
      { field_name: "specialAllowance", label: "Special Allowance (₹)", field_type: "text", is_required: false, sort_order: 13 },
      { field_name: "grossSalary", label: "Gross Salary (₹)", field_type: "text", is_required: true, sort_order: 14 },
      { field_name: "pfDeduction", label: "PF Deduction (₹)", field_type: "text", is_required: false, sort_order: 15 },
      { field_name: "taxDeduction", label: "TDS / Tax (₹)", field_type: "text", is_required: false, sort_order: 16 },
      { field_name: "totalDeductions", label: "Total Deductions (₹)", field_type: "text", is_required: true, sort_order: 17 },
      { field_name: "netSalary", label: "Net Salary (₹)", field_type: "text", is_required: true, sort_order: 18 },
      { field_name: "bankName", label: "Bank Name", field_type: "text", is_required: false, sort_order: 19 },
      { field_name: "accountNumber", label: "Account Number", field_type: "text", is_required: false, sort_order: 20 },
      { field_name: "paymentMode", label: "Payment Mode", field_type: "text", is_required: false, sort_order: 21 },
      { field_name: "signatoryName", label: "Signatory Name", field_type: "text", is_required: true, sort_order: 22 },
      { field_name: "signatoryDesignation", label: "Signatory Designation", field_type: "text", is_required: true, sort_order: 23 },
    ],
  },

  certificate: {
    type: "certificate",
    categorySlug: "staff-certificate",
    categoryName: "Staff Certificate",
    defaultTemplateName: "Official Staff Service & Training Certificate",
    defaultTemplateHtml: `
<div style="width: 794px; min-height: 1080px; padding: 45px; font-family: 'Georgia', serif; color: #1e293b; background: #ffffff; box-sizing: border-box; position: relative; border: 12px double #2563eb;">
  <div style="border: 2px solid #94a3b8; padding: 35px; min-height: 950px; box-sizing: border-box; text-align: center; position: relative;">
    <div style="margin-bottom: 20px; display: flex; justify-content: center; align-items: center; gap: 15px;">
      <div style="width: 65px; height: 65px; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
        <img src="{{institutionLogo}}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
    </div>
    <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px;">
      {{institutionName}}
    </h1>
    <p style="margin: 4px 0 25px 0; font-size: 12px; color: #64748b; font-family: sans-serif;">{{institutionAddress}}</p>

    <div style="margin: 30px 0 15px 0;">
      <h2 style="margin: 0; font-size: 26px; font-weight: 900; color: #2563eb; letter-spacing: 3px; text-transform: uppercase;">
        CERTIFICATE OF COMPLETION
      </h2>
      <div style="width: 120px; height: 3px; background: #2563eb; margin: 10px auto;"></div>
    </div>

    <p style="font-size: 14px; font-style: italic; color: #64748b; margin-bottom: 20px;">This certificate is proudly awarded to</p>
    <div style="font-size: 28px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #cbd5e1; display: inline-block; padding-bottom: 6px; margin-bottom: 25px; min-width: 320px;">
      {{employeeName}}
    </div>

    <div style="font-size: 14px; color: #334155; line-height: 1.8; max-width: 580px; margin: 0 auto 35px auto; font-family: sans-serif;">
      In recognition of their successful completion of the specialized faculty training and excellence program on
      <br/><strong style="font-size: 16px; color: #0f172a;">&ldquo;{{trainingTopic}}&rdquo;</strong><br/>
      conducted at {{institutionName}} on <strong>{{completionDate}}</strong>.
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; font-family: sans-serif; margin-bottom: 40px; padding: 0 30px;">
      <div>Certificate No: <strong>{{certificateNumber}}</strong></div>
      <div>Issued On: <strong>{{issueDate}}</strong></div>
    </div>

    <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 30px;">
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #0f172a; width: 160px; margin-bottom: 6px;"></div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; font-family: sans-serif;">{{signatoryName}}</div>
        <div style="font-size: 11px; color: #64748b; font-family: sans-serif;">{{signatoryDesignation}}</div>
      </div>
      <div style="border: 3px solid #eab308; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #a16207; font-weight: 800; text-transform: uppercase;">
        OFFICIAL<br/>SEAL
      </div>
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #0f172a; width: 160px; margin-bottom: 6px;"></div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; font-family: sans-serif;">Head of Academics</div>
        <div style="font-size: 11px; color: #64748b; font-family: sans-serif;">{{institutionName}}</div>
      </div>
    </div>
  </div>
</div>`,
    fields: [
      { field_name: "institutionName", label: "Institution Name", field_type: "text", is_required: true, sort_order: 0 },
      { field_name: "institutionLogo", label: "Institution Logo", field_type: "image", is_required: false, sort_order: 1 },
      { field_name: "institutionAddress", label: "Institution Address", field_type: "text", is_required: true, sort_order: 2 },
      { field_name: "certificateNumber", label: "Certificate Number", field_type: "text", is_required: true, sort_order: 3 },
      { field_name: "issueDate", label: "Issue Date", field_type: "date", is_required: true, sort_order: 4 },
      { field_name: "employeeName", label: "Recipient / Staff Name", field_type: "text", is_required: true, sort_order: 5 },
      { field_name: "employeeCode", label: "Employee Code / ID", field_type: "text", is_required: true, sort_order: 6 },
      { field_name: "designation", label: "Designation", field_type: "text", is_required: true, sort_order: 7 },
      { field_name: "department", label: "Department", field_type: "text", is_required: true, sort_order: 8 },
      { field_name: "trainingTopic", label: "Training Program / Topic", field_type: "text", is_required: true, sort_order: 9 },
      { field_name: "completionDate", label: "Completion Date", field_type: "date", is_required: true, sort_order: 10 },
      { field_name: "signatoryName", label: "Signatory Name", field_type: "text", is_required: true, sort_order: 11 },
      { field_name: "signatoryDesignation", label: "Signatory Designation", field_type: "text", is_required: true, sort_order: 12 },
    ],
  },

  appreciation_certificate: {
    type: "appreciation_certificate",
    categorySlug: "appreciation-certificate",
    categoryName: "Appreciation Certificate - Staff",
    defaultTemplateName: "Staff Excellence & Appreciation Certificate",
    defaultTemplateHtml: `
<div style="width: 794px; min-height: 1080px; padding: 45px; font-family: 'Georgia', serif; color: #1e293b; background: #ffffff; box-sizing: border-box; position: relative; border: 12px double #d97706;">
  <div style="border: 2px solid #cbd5e1; padding: 35px; min-height: 950px; box-sizing: border-box; text-align: center; position: relative; background: #fffcf5;">
    <div style="margin-bottom: 20px; display: flex; justify-content: center; align-items: center; gap: 15px;">
      <div style="width: 65px; height: 65px; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
        <img src="{{institutionLogo}}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
    </div>
    <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #78350f; text-transform: uppercase; letter-spacing: 1px;">
      {{institutionName}}
    </h1>
    <p style="margin: 4px 0 25px 0; font-size: 12px; color: #92400e; font-family: sans-serif;">{{institutionAddress}}</p>

    <div style="margin: 25px 0 15px 0;">
      <h2 style="margin: 0; font-size: 26px; font-weight: 900; color: #b45309; letter-spacing: 3px; text-transform: uppercase;">
        CERTIFICATE OF APPRECIATION
      </h2>
      <div style="width: 140px; height: 3px; background: #d97706; margin: 10px auto;"></div>
    </div>

    <p style="font-size: 14px; font-style: italic; color: #78350f; margin-bottom: 18px;">This certificate of recognition is honorably presented to</p>
    <div style="font-size: 28px; font-weight: 800; color: #78350f; border-bottom: 2px solid #fde68a; display: inline-block; padding-bottom: 6px; margin-bottom: 25px; min-width: 320px;">
      {{employeeName}}
    </div>

    <div style="font-size: 14px; color: #451a03; line-height: 1.8; max-width: 580px; margin: 0 auto 35px auto; font-family: sans-serif;">
      In sincere appreciation for outstanding dedication, exceptional leadership, and valuable contributions as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> during the academic term <strong>{{recognitionYear}}</strong>.
      <br/><br/>
      <em>&ldquo;{{appreciationReason}}&rdquo;</em>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #92400e; font-family: sans-serif; margin-bottom: 40px; padding: 0 30px;">
      <div>Certificate ID: <strong>{{certificateNumber}}</strong></div>
      <div>Issued On: <strong>{{issueDate}}</strong></div>
    </div>

    <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 30px;">
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #78350f; width: 160px; margin-bottom: 6px;"></div>
        <div style="font-size: 13px; font-weight: 700; color: #78350f; font-family: sans-serif;">{{signatoryName}}</div>
        <div style="font-size: 11px; color: #92400e; font-family: sans-serif;">{{signatoryDesignation}}</div>
      </div>
      <div style="border: 3px solid #d97706; border-radius: 50%; width: 85px; height: 85px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #b45309; font-weight: 900; text-transform: uppercase;">
        AWARD OF<br/>EXCELLENCE
      </div>
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #78350f; width: 160px; margin-bottom: 6px;"></div>
        <div style="font-size: 13px; font-weight: 700; color: #78350f; font-family: sans-serif;">Managing Director</div>
        <div style="font-size: 11px; color: #92400e; font-family: sans-serif;">{{institutionName}}</div>
      </div>
    </div>
  </div>
</div>`,
    fields: [
      { field_name: "institutionName", label: "Institution Name", field_type: "text", is_required: true, sort_order: 0 },
      { field_name: "institutionLogo", label: "Institution Logo", field_type: "image", is_required: false, sort_order: 1 },
      { field_name: "institutionAddress", label: "Institution Address", field_type: "text", is_required: true, sort_order: 2 },
      { field_name: "certificateNumber", label: "Certificate Number", field_type: "text", is_required: true, sort_order: 3 },
      { field_name: "issueDate", label: "Issue Date", field_type: "date", is_required: true, sort_order: 4 },
      { field_name: "employeeName", label: "Recipient / Staff Name", field_type: "text", is_required: true, sort_order: 5 },
      { field_name: "employeeCode", label: "Employee Code / ID", field_type: "text", is_required: true, sort_order: 6 },
      { field_name: "designation", label: "Designation", field_type: "text", is_required: true, sort_order: 7 },
      { field_name: "department", label: "Department", field_type: "text", is_required: true, sort_order: 8 },
      { field_name: "recognitionYear", label: "Recognition Year / Term", field_type: "text", is_required: true, sort_order: 9 },
      { field_name: "appreciationReason", label: "Citation / Appreciation Note", field_type: "text", is_required: true, sort_order: 10 },
      { field_name: "signatoryName", label: "Signatory Name", field_type: "text", is_required: true, sort_order: 11 },
      { field_name: "signatoryDesignation", label: "Signatory Designation", field_type: "text", is_required: true, sort_order: 12 },
    ],
  },
};

export async function ensureDocumentCategoryAndTemplate(docType: string) {
  const config = DOCUMENT_CONFIGS[docType] || DOCUMENT_CONFIGS.experience_letter;

  // 1. Ensure card category exists
  let catRes = await db.query<{ id: number }>(
    `SELECT id FROM card_categories WHERE slug = $1 OR slug = $2 LIMIT 1`,
    [config.categorySlug, `${config.categorySlug}-staff`]
  );
  let categoryId = catRes.rows[0]?.id;

  if (!categoryId) {
    const insertCat = await db.query<{ id: number }>(
      `INSERT INTO card_categories (name, slug, description, target_audience, is_active)
       VALUES ($1, $2, $3, 'staff', TRUE)
       RETURNING id`,
      [config.categoryName, config.categorySlug, `Staff ${config.categoryName} templates`]
    );
    categoryId = insertCat.rows[0]?.id;
  }

  // 2. Ensure default template exists
  if (categoryId) {
    const templateRes = await db.query<{ id: number }>(
      `SELECT id FROM document_templates WHERE card_category_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
      [categoryId]
    );

    if (!templateRes.rows[0]) {
      const insertTemplate = await db.query<{ id: number }>(
        `INSERT INTO document_templates (
           card_category_id, name, html_template, version, is_public, is_active
         )
         VALUES ($1, $2, $3, 1, TRUE, TRUE)
         RETURNING id`,
        [categoryId, config.defaultTemplateName, config.defaultTemplateHtml]
      );
      const templateId = insertTemplate.rows[0]?.id;

      if (templateId) {
        for (const field of config.fields) {
          await db.query(
            `INSERT INTO document_template_fields (
               template_id, field_name, label, field_type, is_required, sort_order
             )
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [templateId, field.field_name, field.label, field.field_type, field.is_required, field.sort_order]
          );
        }
      }
    }
  }

  // 3. Ensure staff_generated_letters table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS staff_generated_letters (
      id BIGSERIAL PRIMARY KEY,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE RESTRICT,
      card_category_id INTEGER REFERENCES card_categories(id) ON DELETE RESTRICT,
      title VARCHAR(200) NOT NULL,
      letter_type VARCHAR(80) NOT NULL DEFAULT 'experience_letter',
      rendered_html TEXT NOT NULL,
      field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
      image_url TEXT,
      pdf_url TEXT,
      canvas_width INTEGER,
      canvas_height INTEGER,
      generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMP,
      deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_staff_generated_letters_inst_type
      ON staff_generated_letters(institution_id, letter_type, is_deleted, created_at DESC);
  `);
}

export async function handleDocumentGet(req: Request, defaultDocType: string) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const docType = url.searchParams.get("doc_type") || defaultDocType;
    const config = DOCUMENT_CONFIGS[docType] || DOCUMENT_CONFIGS.experience_letter;

    await ensureDocumentCategoryAndTemplate(docType);

    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const isInstitutionAdmin = isInstitutionAdminUser(currentUser);

    if (!isPlatformAdmin && !isInstitutionAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const view = url.searchParams.get("view");

    // 1. View = "templates" -> Return all templates for this category
    if (view === "templates") {
      const templatesRes = await db.query(
        `SELECT
           dt.id,
           dt.card_category_id,
           dt.name,
           dt.html_template,
           dt.version,
           dt.is_active,
           dt.created_at,
           cc.name AS category_name,
           cc.slug AS category_slug,
           COALESCE(
             (
               SELECT json_agg(
                 json_build_object(
                   'field_name', dtf.field_name,
                   'label', dtf.label,
                   'field_type', dtf.field_type,
                   'is_required', dtf.is_required
                 )
                 ORDER BY dtf.sort_order ASC
               )
               FROM document_template_fields dtf
               WHERE dtf.template_id = dt.id
             ),
             '[]'::json
           ) AS fields
         FROM document_templates dt
         JOIN card_categories cc ON cc.id = dt.card_category_id
         WHERE (
            cc.slug = $1
            OR cc.slug = $2
            OR cc.name ILIKE '%' || $3 || '%'
            OR dt.name ILIKE '%' || $3 || '%'
          )
          AND dt.is_active = TRUE
          AND COALESCE(dt.is_deleted, FALSE) = FALSE
         ORDER BY dt.created_at DESC`,
        [config.categorySlug, `${config.categorySlug}-staff`, config.categorySlug.replace("-", " ")]
      );

      return NextResponse.json({ data: templatesRes.rows });
    }

    // 2. View = "staff-options" -> Return all staff members added by Platform Admin across institutions
    if (view === "staff-options") {
      const institutionIdRaw = Number(url.searchParams.get("institutionId"));
      const targetInstitutionId = Number.isInteger(institutionIdRaw) && institutionIdRaw > 0
        ? institutionIdRaw
        : null;

      const instFilter = targetInstitutionId && !isPlatformAdmin
        ? `AND (im.institution_id = ${targetInstitutionId} OR up.under_institution_id = ${targetInstitutionId})`
        : "";

      const staffRes = await db.query(
        `SELECT DISTINCT ON (u.id)
           u.id,
           u.full_name,
           u.email,
           u.phone,
           COALESCE(im.institution_id, up.under_institution_id, default_ip.id, 1) AS institution_id,
           COALESCE(ip.name, default_ip.name, 'Maa Sharda Institute') AS institution_name,
           COALESCE(loc.name, 'Main Campus, Varanasi') AS institution_address,
           COALESCE(ip.email, default_ip.email, 'info@edubird.com') AS institution_email,
           COALESCE(ip.phone, default_ip.phone, '+91 98765 43210') AS institution_phone,
           COALESCE(ip.logo_url, default_ip.logo_url, '') AS institution_logo,
           COALESCE(desig.name, r.name, 'Staff Member') AS role_label,
           COALESCE(r.code, 'staff') AS role_code,
           COALESCE(desig.name, 'Academic Operations') AS designation_name,
           COALESCE(up.joining_date::text, u.created_at::date::text, '2023-01-01') AS joining_date
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         LEFT JOIN designations desig ON desig.id = up.designation_id
         LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
         LEFT JOIN roles r ON r.id = im.role_id
         LEFT JOIN institution_profiles ip ON ip.id = COALESCE(im.institution_id, up.under_institution_id)
         LEFT JOIN locations loc ON loc.id = ip.location_id
         LEFT JOIN LATERAL (
           SELECT id, name, email, phone, logo_url
           FROM institution_profiles
           WHERE is_active = TRUE AND COALESCE(is_deleted, FALSE) = FALSE
           ORDER BY id ASC
           LIMIT 1
         ) default_ip ON TRUE
         WHERE u.is_active = TRUE
           AND COALESCE(u.is_deleted, FALSE) = FALSE
           ${instFilter}
         ORDER BY u.id, u.full_name ASC
         LIMIT 250`
      );

      return NextResponse.json({ data: staffRes.rows });
    }

    // 3. Default: List Generated Letters / Documents
    const institutionIdParam = Number(url.searchParams.get("institutionId"));
    const targetInstitutionId = Number.isInteger(institutionIdParam) && institutionIdParam > 0
      ? institutionIdParam
      : null;

    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() || "";

    const conditions: string[] = ["sgl.is_deleted = FALSE", "sgl.letter_type = $1"];
    const params: unknown[] = [docType];
    let paramIndex = 2;

    if (targetInstitutionId && !isPlatformAdmin) {
      conditions.push(`sgl.institution_id = $${paramIndex}`);
      params.push(targetInstitutionId);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(
        u.full_name ILIKE $${paramIndex}
        OR sgl.title ILIKE $${paramIndex}
        OR u.email ILIKE $${paramIndex}
        OR u.phone ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const countRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM staff_generated_letters sgl
       JOIN users u ON u.id = sgl.staff_user_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.count || "0", 10);

    const listParams = [...params, limit, offset];
    const lettersRes = await db.query(
      `SELECT
         sgl.id,
         sgl.institution_id,
         ip.name AS institution_name,
         sgl.staff_user_id,
         u.full_name,
         u.email,
         u.phone,
         sgl.template_id,
         dt.name AS template_name,
         sgl.card_category_id,
         cc.name AS category_name,
         sgl.title,
         sgl.letter_type,
         sgl.rendered_html,
         sgl.field_values,
         sgl.image_url,
         sgl.pdf_url,
         sgl.created_at,
         gen_u.full_name AS generated_by_name
       FROM staff_generated_letters sgl
       JOIN users u ON u.id = sgl.staff_user_id
       LEFT JOIN institution_profiles ip ON ip.id = sgl.institution_id
       LEFT JOIN document_templates dt ON dt.id = sgl.template_id
       LEFT JOIN card_categories cc ON cc.id = sgl.card_category_id
       LEFT JOIN users gen_u ON gen_u.id = sgl.generated_by
       WHERE ${whereClause}
       ORDER BY sgl.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      listParams
    );

    return NextResponse.json({
      data: lettersRes.rows,
      total,
      pageCount: getPageCount(total, limit),
    });
  } catch (error) {
    console.error(`[STAFF_DOCUMENTS_GET]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function handleDocumentPost(req: Request, defaultDocType: string) {
  try {
    const currentUser = await requireAdmin(req);
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const isInstitutionAdmin = isInstitutionAdminUser(currentUser);

    if (!isPlatformAdmin && !isInstitutionAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      institutionId,
      staffUserId,
      templateId,
      cardCategoryId,
      title,
      letterType = defaultDocType,
      renderedHtml,
      fieldValues = {},
      imageUrl,
      pdfUrl,
      canvasWidth = 794,
      canvasHeight = 1080,
    } = body;

    if (!staffUserId || !templateId || !renderedHtml || !title) {
      return NextResponse.json(
        { error: "Staff member, template, title, and document content are required" },
        { status: 400 }
      );
    }

    let finalInstitutionId = Number(institutionId);
    if (!Number.isInteger(finalInstitutionId) || finalInstitutionId <= 0) {
      const userInstRes = await db.query<{ institution_id: number }>(
        `SELECT institution_id FROM institution_memberships WHERE user_id = $1 AND is_active = TRUE LIMIT 1`,
        [staffUserId]
      );
      finalInstitutionId = userInstRes.rows[0]?.institution_id || 1;
    }

    const insertRes = await db.query(
      `INSERT INTO staff_generated_letters (
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
       RETURNING *`,
      [
        finalInstitutionId,
        staffUserId,
        templateId,
        cardCategoryId || null,
        title,
        letterType,
        renderedHtml,
        JSON.stringify(fieldValues),
        imageUrl || null,
        pdfUrl || null,
        canvasWidth,
        canvasHeight,
        currentUser.id,
      ]
    );

    return NextResponse.json({ data: insertRes.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(`[STAFF_DOCUMENTS_POST]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create document record" },
      { status: 500 }
    );
  }
}

export async function handleDocumentDelete(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const isInstitutionAdmin = isInstitutionAdminUser(currentUser);

    if (!isPlatformAdmin && !isInstitutionAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const url = new URL(req.url);
    const letterId = Number(url.searchParams.get("id"));

    if (!letterId || !Number.isInteger(letterId)) {
      return NextResponse.json({ error: "Valid document ID required" }, { status: 400 });
    }

    await db.query(
      `UPDATE staff_generated_letters
       SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
       WHERE id = $2`,
      [currentUser.id, letterId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[STAFF_DOCUMENTS_DELETE]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete document record" },
      { status: 500 }
    );
  }
}
