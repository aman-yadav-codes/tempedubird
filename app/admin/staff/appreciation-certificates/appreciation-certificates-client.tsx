"use client";

import { Trophy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  StaffDocumentGeneratorClient,
  StaffOption,
} from "@/app/admin/staff/_components/staff-document-generator-client";

export function AppreciationCertificatesClient() {
  return (
    <StaffDocumentGeneratorClient
      docType="appreciation_certificate"
      apiEndpoint="/api/admin/staff/appreciation-certificates"
      title="Staff Appreciation Certificates"
      subtitle="Honor high-performing teachers, faculty, and support personnel with official awards and appreciation certificates."
      entityName="Appreciation Certificate"
      icon={Trophy}
      defaultRefPrefix="AWARD"
      mapStaffToDefaultFields={(staff: StaffOption, currentUser, isPlatformAdmin) => {
        const todayStr = new Date().toLocaleDateString("en-IN", {
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
          designation: staff.role_label || "Academic Faculty",
          department: "Academic Operations",
          certificateNumber: `APPR-${new Date().getFullYear()}-${staff.id}`,
          awardTitle: "Excellence in Academic Mentorship & Service",
          recognitionYear: "2025-2026",
          appreciationReason: "Demonstrating exceptional commitment, student success, and dedicated leadership.",
          issueDate: todayStr,
          signatoryName: currentUser?.full_name || "Deepak Yadav",
          signatoryDesignation: isPlatformAdmin ? "Director & Chairman" : "Managing Director",
        };
      }}
      renderCustomFields={(fieldForm, setFieldForm) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Recipient / Staff Name</Label>
              <Input
                value={fieldForm.employeeName || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, employeeName: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Staff ID / Code</Label>
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

          <div>
            <Label className="text-xs">Award Title / Recognition</Label>
            <Input
              value={fieldForm.awardTitle || ""}
              onChange={(e) => setFieldForm({ ...fieldForm, awardTitle: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Citation / Appreciation Note</Label>
            <Input
              value={fieldForm.appreciationReason || ""}
              onChange={(e) => setFieldForm({ ...fieldForm, appreciationReason: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Recognition Year / Term</Label>
              <Input
                value={fieldForm.recognitionYear || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, recognitionYear: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Issue Date</Label>
              <Input
                value={fieldForm.issueDate || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, issueDate: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Certificate ID</Label>
              <Input
                value={fieldForm.certificateNumber || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, certificateNumber: e.target.value })}
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
            <Label className="text-xs">Signatory Designation</Label>
            <Input
              value={fieldForm.signatoryDesignation || ""}
              onChange={(e) => setFieldForm({ ...fieldForm, signatoryDesignation: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Institution / Academy Name</Label>
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
