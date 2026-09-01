"use client";

import { Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  StaffDocumentGeneratorClient,
  StaffOption,
  formatDateDisplay,
} from "@/app/admin/staff/_components/staff-document-generator-client";

export function OfferLettersClient() {
  return (
    <StaffDocumentGeneratorClient
      docType="offer_letter"
      apiEndpoint="/api/admin/staff/offer-letters"
      title="Staff Offer Letters"
      subtitle="Generate, customize, and issue official employment offer and appointment letters for faculty and staff."
      entityName="Offer Letter"
      icon={Mail}
      defaultRefPrefix="OFFER"
      mapStaffToDefaultFields={(staff: StaffOption, currentUser, isPlatformAdmin) => {
        const todayStr = new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        const validUntilDate = new Date();
        validUntilDate.setDate(validUntilDate.getDate() + 15);
        const validUntilStr = validUntilDate.toLocaleDateString("en-IN", {
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
          employeeEmail: staff.email || "",
          employeePhone: staff.phone || "",
          designation: staff.role_label || "Academic Faculty",
          department: "Academic Operations",
          joiningDate: staff.joining_date ? formatDateDisplay(staff.joining_date) : todayStr,
          offerValidUntil: validUntilStr,
          monthlySalary: "₹45,000",
          annualCTC: "₹5,40,000",
          reportingManager: "Head of Academic Operations",
          issueDate: todayStr,
          signatoryName: currentUser?.full_name || "Deepak Yadav",
          signatoryDesignation: isPlatformAdmin ? "Director & Chairman" : "Principal & Head of Institute",
        };
      }}
      renderCustomFields={(fieldForm, setFieldForm) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Candidate Name</Label>
              <Input
                value={fieldForm.employeeName || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, employeeName: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Candidate ID</Label>
              <Input
                value={fieldForm.employeeCode || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, employeeCode: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Candidate Email</Label>
              <Input
                value={fieldForm.employeeEmail || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, employeeEmail: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Candidate Phone</Label>
              <Input
                value={fieldForm.employeePhone || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, employeePhone: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Offered Designation</Label>
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
              <Label className="text-xs">Monthly Salary</Label>
              <Input
                value={fieldForm.monthlySalary || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, monthlySalary: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Annual CTC</Label>
              <Input
                value={fieldForm.annualCTC || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, annualCTC: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date of Joining</Label>
              <Input
                value={fieldForm.joiningDate || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, joiningDate: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Offer Valid Until</Label>
              <Input
                value={fieldForm.offerValidUntil || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, offerValidUntil: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Reporting Manager</Label>
              <Input
                value={fieldForm.reportingManager || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, reportingManager: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Reference No.</Label>
              <Input
                value={fieldForm.referenceNumber || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, referenceNumber: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Signatory Name</Label>
              <Input
                value={fieldForm.signatoryName || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, signatoryName: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Signatory Designation</Label>
              <Input
                value={fieldForm.signatoryDesignation || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, signatoryDesignation: e.target.value })}
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
