"use client";

import { CreditCard } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  StaffDocumentGeneratorClient,
  StaffOption,
} from "@/app/admin/staff/_components/staff-document-generator-client";

export function SalarySlipsClient() {
  return (
    <StaffDocumentGeneratorClient
      docType="salary_slip"
      apiEndpoint="/api/admin/staff/salary-slips"
      title="Staff Salary Slips"
      subtitle="Prepare, preview, print, and archive monthly salary slips for faculty and support staff."
      entityName="Salary Slip"
      icon={CreditCard}
      defaultRefPrefix="PAY"
      mapStaffToDefaultFields={(staff: StaffOption, currentUser, isPlatformAdmin) => {
        const dateObj = new Date();
        const monthName = dateObj.toLocaleString("en-IN", { month: "long" });
        const yearStr = String(dateObj.getFullYear());
        const todayStr = dateObj.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        return {
          institutionName: staff.institution_name || "Maa Sharda Institute",
          institutionAddress: staff.institution_address || "Main Campus, Pandeypur, Varanasi",
          institutionEmail: staff.institution_email || "info@edubird.com",
          institutionPhone: staff.institution_phone || "+91 98765 43210",
          institutionLogo: staff.institution_logo || "",
          employeeName: staff.full_name,
          employeeCode: `EMP-${staff.id}`,
          designation: staff.role_label || "Faculty Member",
          department: "Academic Operations",
          payMonth: monthName,
          payYear: yearStr,
          issueDate: todayStr,
          basicSalary: "₹30,000.00",
          hraAllowance: "₹8,000.00",
          daAllowance: "₹4,500.00",
          specialAllowance: "₹2,500.00",
          grossSalary: "₹45,000.00",
          pfDeduction: "₹1,800.00",
          taxDeduction: "₹1,200.00",
          totalDeductions: "₹3,000.00",
          netSalary: "₹42,000.00",
          bankName: "State Bank of India",
          accountNumber: `XXXXXXXX${String(staff.id).padStart(4, "0")}`,
          paymentMode: "Direct Bank Transfer",
          signatoryName: currentUser?.full_name || "Deepak Yadav",
          signatoryDesignation: isPlatformAdmin ? "Director & Chairman" : "Accounts & Finance Head",
        };
      }}
      renderCustomFields={(fieldForm, setFieldForm) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Employee Name</Label>
              <Input
                value={fieldForm.employeeName || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, employeeName: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Employee Code</Label>
              <Input
                value={fieldForm.employeeCode || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, employeeCode: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Designation</Label>
              <Input
                value={fieldForm.designation || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, designation: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Input
                value={fieldForm.department || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, department: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Pay Month</Label>
              <Input
                value={fieldForm.payMonth || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, payMonth: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Pay Year</Label>
              <Input
                value={fieldForm.payYear || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, payYear: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Basic Salary</Label>
              <Input
                value={fieldForm.basicSalary || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, basicSalary: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">HRA Allowance</Label>
              <Input
                value={fieldForm.hraAllowance || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, hraAllowance: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">DA Allowance</Label>
              <Input
                value={fieldForm.daAllowance || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, daAllowance: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Special Allowance</Label>
              <Input
                value={fieldForm.specialAllowance || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, specialAllowance: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-emerald-700">Gross Salary</Label>
              <Input
                value={fieldForm.grossSalary || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, grossSalary: e.target.value })}
                className="h-8 text-xs mt-1 font-semibold"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-rose-700">Total Deductions</Label>
              <Input
                value={fieldForm.totalDeductions || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, totalDeductions: e.target.value })}
                className="h-8 text-xs mt-1 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">PF Deduction</Label>
              <Input
                value={fieldForm.pfDeduction || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, pfDeduction: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Tax / TDS</Label>
              <Input
                value={fieldForm.taxDeduction || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, taxDeduction: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-emerald-600">Net Payable Salary</Label>
            <Input
              value={fieldForm.netSalary || ""}
              onChange={(e) => setFieldForm({ ...fieldForm, netSalary: e.target.value })}
              className="h-8 text-xs mt-1 font-bold text-emerald-700 bg-emerald-50/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Bank Name</Label>
              <Input
                value={fieldForm.bankName || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, bankName: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Account Number</Label>
              <Input
                value={fieldForm.accountNumber || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, accountNumber: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Payment Mode</Label>
              <Input
                value={fieldForm.paymentMode || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, paymentMode: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Signatory Name</Label>
              <Input
                value={fieldForm.signatoryName || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, signatoryName: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Institution / Company Name</Label>
            <Input
              value={fieldForm.institutionName || ""}
              onChange={(e) => setFieldForm({ ...fieldForm, institutionName: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Institution Address</Label>
            <Input
              value={fieldForm.institutionAddress || ""}
              onChange={(e) => setFieldForm({ ...fieldForm, institutionAddress: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>
        </>
      )}
    />
  );
}
