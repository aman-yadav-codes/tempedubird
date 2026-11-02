import { recordPerformancePoints } from "@/lib/performance/performance-engine";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireAdmin } from "@/lib/auth/auth";
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

async function getEffectiveUserInstitutionId(user: { id: number; role_codes?: string[]; is_super_admin?: boolean }, requestedInstitutionId?: number | null): Promise<number | null> {
  const isPlatformAdmin = isPlatformAdminUser(user);
  if (isPlatformAdmin) {
    return requestedInstitutionId || null;
  }

  // Check institution memberships
  const memRes = await db.query<{ institution_id: number }>(
    `SELECT institution_id FROM institution_memberships WHERE user_id = $1 AND is_active = TRUE AND COALESCE(is_deleted, FALSE) = FALSE ORDER BY is_primary DESC, id ASC LIMIT 1`,
    [user.id]
  );
  if (memRes.rows[0]?.institution_id) {
    return memRes.rows[0].institution_id;
  }

  // Check user profiles
  const profileRes = await db.query<{ under_institution_id: number }>(
    `SELECT under_institution_id FROM user_profiles WHERE user_id = $1 LIMIT 1`,
    [user.id]
  );
  if (profileRes.rows[0]?.under_institution_id) {
    return profileRes.rows[0].under_institution_id;
  }

  return requestedInstitutionId || null;
}

export async function handleDocumentGet(req: Request, defaultDocType: string) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const docType = url.searchParams.get("doc_type") || defaultDocType;
    const config = DOCUMENT_CONFIGS[docType] || DOCUMENT_CONFIGS.experience_letter;

    await ensureDocumentCategoryAndTemplate(docType);

    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const isInstitutionAdmin = isInstitutionAdminUser(currentUser);
    const userInstId = await getEffectiveUserInstitutionId(currentUser);

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

    // 2. View = "staff-options" -> Return staff members belonging to the admin's institution
    if (view === "staff-options") {
      if (!isPlatformAdmin && !isInstitutionAdmin) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }

      const institutionIdRaw = Number(url.searchParams.get("institutionId"));
      const targetInstitutionId = isPlatformAdmin
        ? (Number.isInteger(institutionIdRaw) && institutionIdRaw > 0 ? institutionIdRaw : null)
        : userInstId;

      const instFilter = targetInstitutionId
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
    // Strictly isolate:
    // - Platform Admin: can view all or filter by institutionId
    // - Institution Admin: can ONLY see documents belonging to their institution
    // - Staff Member: can ONLY see documents generated for their own staff_user_id
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() || "";

    const conditions: string[] = ["sgl.is_deleted = FALSE", "sgl.letter_type = $1"];
    const params: unknown[] = [docType];
    let paramIndex = 2;

    const staffUserIdParam = Number(url.searchParams.get("staffUserId"));
    if (Number.isInteger(staffUserIdParam) && staffUserIdParam > 0) {
      conditions.push(`sgl.staff_user_id = $${paramIndex}`);
      params.push(staffUserIdParam);
      paramIndex++;
    }

    if (isPlatformAdmin) {
      const institutionIdParam = Number(url.searchParams.get("institutionId"));
      if (Number.isInteger(institutionIdParam) && institutionIdParam > 0) {
        conditions.push(`sgl.institution_id = $${paramIndex}`);
        params.push(institutionIdParam);
        paramIndex++;
      }
    } else if (isInstitutionAdmin) {
      const targetInstitutionId = userInstId || Number(url.searchParams.get("institutionId"));
      if (targetInstitutionId) {
        conditions.push(`sgl.institution_id = $${paramIndex}`);
        params.push(targetInstitutionId);
        paramIndex++;
      }
    } else {
      // Regular staff member: only view their own generated documents
      conditions.push(`sgl.staff_user_id = $${paramIndex}`);
      params.push(currentUser.id);
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
    rowsHtml.push(`
      <tr>
        <td style="padding: 9px 14px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${earn ? earn.name : ""}</td>
        <td style="padding: 9px 14px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 600; color: #0f172a;">${earn ? "₹" + Number(earn.amount).toLocaleString("en-IN") : ""}</td>
        <td style="padding: 9px 14px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${ded ? ded.name : ""}</td>
        <td style="padding: 9px 14px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 600; color: #0f172a;">${ded ? "₹" + Number(ded.amount).toLocaleString("en-IN") : ""}</td>
      </tr>
    `);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Salary Slip - ${monthName} - ${staff.full_name}</title>
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
        <div style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">${institution.name || "EduBird Educational Platform"}</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">${institution.address || "Main Institutional Campus"}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
          ${institution.email ? "Email: " + institution.email : ""} ${institution.phone ? " | Tel: " + institution.phone : ""}
        </div>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; padding: 4px 12px; background: #e0f2fe; color: #0369a1; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Payslip / Salary Slip</span>
        <div style="font-size: 18px; font-weight: 800; color: #2563eb; margin-top: 6px;">${monthName}</div>
      </div>
    </div>

    <!-- Employee Details Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; font-size: 13px;">
        <div><span style="color: #64748b; font-weight: 500;">Employee Name:</span> <strong style="color: #0f172a;">${staff.full_name}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">Designation / Role:</span> <strong style="color: #0f172a;">${staff.designation || "Staff Member"}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">Employee ID:</span> <strong style="color: #0f172a;">EMP-${staff.id}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">Joining Date:</span> <strong style="color: #0f172a;">${staff.joining_date ? new Date(staff.joining_date).toLocaleDateString('en-IN') : "N/A"}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">Bank Name:</span> <strong style="color: #0f172a;">${staff.bank_name || "N/A"}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">Account Number:</span> <strong style="color: #0f172a;">${staff.account_number ? "XXXX-XXXX-" + staff.account_number.slice(-4) : "N/A"}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">IFSC Code:</span> <strong style="color: #0f172a;">${staff.ifsc_code || "N/A"}</strong></div>
        <div><span style="color: #64748b; font-weight: 500;">PAN Number:</span> <strong style="color: #0f172a;">${staff.pan_number || "N/A"}</strong></div>
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
        ${rowsHtml.join("")}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: 800;">
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 13px; color: #0f172a;">Total Gross Earnings</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 13px; text-align: right; color: #16a34a;">₹${grossSalary.toLocaleString("en-IN")}</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 13px; color: #0f172a;">Total Deductions</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 13px; text-align: right; color: #dc2626;">₹${totalDeductions.toLocaleString("en-IN")}</td>
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
        ₹${netSalary.toLocaleString("en-IN")}
      </div>
    </div>

    ${notes ? `<div style="font-size: 12px; color: #64748b; margin-bottom: 24px; font-style: italic;">Note: ${notes}</div>` : ""}

    <!-- Footer Signatures -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 36px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #64748b;">
      <div>
        <div>Generated Date: ${generatedDate}</div>
        <div style="margin-top: 2px;">This is a system generated document and does not require a physical signature.</div>
      </div>
      <div style="text-align: center;">
        <div style="border-bottom: 1.5px solid #0f172a; width: 170px; margin-bottom: 6px;"></div>
        <div style="font-weight: 700; color: #0f172a;">Authorized Signatory</div>
      </div>
    </div>

  </div>
</body>
</html>`;
}

export async function handleDocumentPost(req: Request, defaultDocType: string) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const isInstitutionAdmin = isInstitutionAdminUser(currentUser);

    if (!isPlatformAdmin && !isInstitutionAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const userInstId = await getEffectiveUserInstitutionId(currentUser);
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

    let finalInstitutionId = isPlatformAdmin
      ? Number(institutionId) || userInstId || 1
      : userInstId || Number(institutionId);

    if (!finalInstitutionId && staffUserId) {
      const userInstRes = await db.query<{ institution_id: number }>(
        `SELECT institution_id FROM institution_memberships WHERE user_id = $1 AND is_active = TRUE LIMIT 1`,
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

      const staffRes = await db.query(`
        SELECT u.id, u.full_name, u.email, u.phone,
               up.bank_name, up.account_holder_name, up.account_number, up.ifsc_code,
               up.pan_number, up.uan_number, up.esi_number, up.joining_date, up.shift_timing,
               COALESCE(r.name, 'Staff Member') as designation
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = $1 LIMIT 1
      `, [staffUserId]);
      const staff = staffRes.rows[0] || { id: staffUserId, full_name: "Staff Member", email: "", designation: "Staff Member" };

      const instRes = await db.query(`
        SELECT ip.id, ip.name, ip.logo_url, ip.phone, ip.email,
               COALESCE(loc.name, 'Main Campus') AS address
        FROM institution_profiles ip
        LEFT JOIN locations loc ON loc.id = ip.location_id
        WHERE ip.id = $1 LIMIT 1
      `, [finalInstitutionId || 1]);
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
        const compRes = await db.query(`
          SELECT label as component_name, amount, COALESCE(component_type, 'EARNING') as component_type
          FROM staff_salary_components
          WHERE user_id = $1
          ORDER BY sort_order ASC, id ASC
        `, [staffUserId]);

        if (compRes.rows.length > 0) {
          compRes.rows.forEach((c) => {
            const amt = Number(c.amount) || 0;
            if (c.component_type === "DEDUCTION") {
              deductionsList.push({ name: c.component_name || "Deduction", amount: amt });
            } else {
              earnings.push({ name: c.component_name || "Basic Salary", amount: amt });
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

        // Automatically calculate Bonus, Commission, and Attendance Deductions for this employee & month
        try {
          const payoutRes = await db.query(
            `SELECT bonus_amount, manual_deduction, deduction_amount
             FROM staff_salary_payouts
             WHERE staff_user_id = $1 AND salary_month = $2 LIMIT 1`,
            [staffUserId, monthStr]
          );
          if (payoutRes.rows.length > 0) {
            const p = payoutRes.rows[0];
            if (Number(p.bonus_amount) > 0) {
              earnings.push({ name: "Performance Bonus", amount: Number(p.bonus_amount) });
            }
            if (Number(p.manual_deduction) > 0) {
              deductionsList.push({ name: "Other Deduction", amount: Number(p.manual_deduction) });
            }
            if (Number(p.deduction_amount) > 0 && !deductionsList.some((d: any) => d.name === "Attendance / Leave Deduction")) {
              deductionsList.push({ name: "Attendance / Leave Deduction", amount: Number(p.deduction_amount) });
            }
          }

          const pointsRes = await db.query(
            `SELECT COALESCE(SUM(points), 0) AS total_bonus_pts
             FROM staff_performance_points_ledger
             WHERE employee_id = $1 AND point_type = 'task_completed'
               AND to_char(created_at, 'YYYY-MM') = $2`,
            [staffUserId, monthStr]
          ).catch(() => ({ rows: [] }));
          if (pointsRes.rows.length > 0 && Number(pointsRes.rows[0].total_bonus_pts) > 0) {
            const bonusPts = Number(pointsRes.rows[0].total_bonus_pts);
            if (!earnings.some((e: any) => e.name.includes("Bonus"))) {
              earnings.push({ name: `Task Completion Bonus (${bonusPts} pts)`, amount: bonusPts * 10 });
            }
          }

          const commRes = await db.query(
            `SELECT commission_rate, commission_type, minimum_threshold
             FROM staff_commission_structures
             WHERE user_id = $1 LIMIT 1`,
            [staffUserId]
          ).catch(() => ({ rows: [] }));
          if (commRes.rows.length > 0 && Number(commRes.rows[0].commission_rate) > 0) {
            earnings.push({ name: "Sales / Task Commission", amount: Number(commRes.rows[0].commission_rate) });
          }
        } catch (calcErr) {
          console.warn("[salary_slip] Failed to fetch dynamic bonus/deductions:", calcErr);
        }
      }

      const grossSalary = earnings.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalDeductions = deductionsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      finalTitle = `Salary Slip - ${monthName} (${staff.full_name})`;

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
        account_number: staff.account_number ? `XXXX-XXXX-${staff.account_number.slice(-4)}` : "N/A",
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
    );

    const createdDoc = insertRes.rows[0];
    if (createdDoc?.id && currentUser?.id) {
      try {
        const lowerTitle = String(finalTitle || "").toLowerCase();
        if (letterType === "salary_slip" || defaultDocType === "salary_slip" || lowerTitle.includes("salary")) {
          await recordPerformancePoints({
            employeeId: currentUser.id,
            activityType: "finance_salary_slip",
            referenceModule: "staff_salary_slip",
            referenceRecordId: createdDoc.id,
            performedBy: { id: currentUser.id, name: currentUser.full_name || "Admin" },
            customDescription: "Generated salary slip: " + (finalTitle || "Salary Slip"),
            institutionId: finalInstitutionId || undefined,
          });
        } else if (letterType === "experience_letter" || lowerTitle.includes("experience")) {
          await recordPerformancePoints({
            employeeId: currentUser.id,
            activityType: "recruitment_experience_letter",
            referenceModule: "staff_letter",
            referenceRecordId: createdDoc.id,
            performedBy: { id: currentUser.id, name: currentUser.full_name || "Admin" },
            customDescription: "Generated experience letter: " + (finalTitle || "Experience Letter"),
            institutionId: finalInstitutionId || undefined,
          });
        } else if (letterType === "offer_letter" || lowerTitle.includes("offer")) {
          await recordPerformancePoints({
            employeeId: currentUser.id,
            activityType: "recruitment_offer_letter",
            referenceModule: "staff_letter",
            referenceRecordId: createdDoc.id,
            performedBy: { id: currentUser.id, name: currentUser.full_name || "Admin" },
            customDescription: "Generated offer letter: " + (finalTitle || "Offer Letter"),
            institutionId: finalInstitutionId || undefined,
          });
        }
      } catch (perfErr) {
        console.warn("[Staff Document] Performance points warning:", perfErr);
      }
    }

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
    const currentUser = await getAuthenticatedUser(req);
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const isInstitutionAdmin = isInstitutionAdminUser(currentUser);

    if (!isPlatformAdmin && !isInstitutionAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const userInstId = await getEffectiveUserInstitutionId(currentUser);
    const url = new URL(req.url);
    const letterId = Number(url.searchParams.get("id"));

    if (!letterId || !Number.isInteger(letterId)) {
      return NextResponse.json({ error: "Valid document ID required" }, { status: 400 });
    }

    const conditions: string[] = ["id = $1"];
    const params: unknown[] = [letterId];

    if (!isPlatformAdmin && userInstId) {
      conditions.push("institution_id = $2");
      params.push(userInstId);
    }

    const updateRes = await db.query(
      `UPDATE staff_generated_letters
       SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = ${currentUser.id}
       WHERE ${conditions.join(" AND ")}
       RETURNING id`,
      params
    );

    if (updateRes.rowCount === 0) {
      return NextResponse.json({ error: "Document not found or permission denied" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[STAFF_DOCUMENTS_DELETE]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete document record" },
      { status: 500 }
    );
  }
}

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
      `UPDATE staff_generated_letters
       SET title = COALESCE($1, title),
           rendered_html = COALESCE($2, rendered_html),
           field_values = COALESCE($3::jsonb, field_values),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
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
