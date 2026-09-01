"use client";

import { FileCheck2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  StaffDocumentGeneratorClient,
  StaffOption,
  formatDateDisplay,
} from "@/app/admin/staff/_components/staff-document-generator-client";

export function ExperienceLettersClient() {
  return (
    <StaffDocumentGeneratorClient
      docType="experience_letter"
      apiEndpoint="/api/admin/staff/experience-letters"
      title="Experience Letters"
      subtitle="Generate, customize, and archive official experience letters and relieving certificates for staff."
      entityName="Experience Letter"
      icon={FileCheck2}
      defaultRefPrefix="EXP"
      mapStaffToDefaultFields={(staff: StaffOption, currentUser, isPlatformAdmin) => {
        const todayStr = new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        const joiningStr = staff.joining_date ? formatDateDisplay(staff.joining_date) : "01 Jun 2023";

        return {
          institutionName: staff.institution_name || "Maa Sharda Institute",
          institutionAddress: staff.institution_address || "Main Campus, Pandeypur, Varanasi",
          institutionEmail: staff.institution_email || "info@edubird.com",
          institutionPhone: staff.institution_phone || "+91 98765 43210",
          institutionLogo: staff.institution_logo || "",
          employeeName: staff.full_name,
          employeeCode: `EMP-${staff.id}`,
          designation: staff.role_label || "Academic Faculty",
          department: "Academic Operations",
          joiningDate: joiningStr,
          relievingDate: todayStr,
          issueDate: todayStr,
          conductAssessment: "exemplary, dedicated, and professional",
          signatoryName: currentUser?.full_name || "Deepak Yadav",
          signatoryDesignation: isPlatformAdmin ? "Director & Chairman" : "Principal & Head of Institute",
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
              <Label className="text-xs">Date of Joining</Label>
              <Input
                value={fieldForm.joiningDate || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, joiningDate: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Date of Relieving</Label>
              <Input
                value={fieldForm.relievingDate || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, relievingDate: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Issue Date</Label>
              <Input
                value={fieldForm.issueDate || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, issueDate: e.target.value })}
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

          <div>
            <Label className="text-xs">Conduct &amp; Character Assessment</Label>
            <Input
              value={fieldForm.conductAssessment || ""}
              onChange={(e) => setFieldForm({ ...fieldForm, conductAssessment: e.target.value })}
              className="h-8 text-xs mt-1"
            />
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
