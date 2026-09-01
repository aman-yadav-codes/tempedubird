"use client";

import { BadgeCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  StaffDocumentGeneratorClient,
  StaffOption,
} from "@/app/admin/staff/_components/staff-document-generator-client";

export function StaffCertificatesClient() {
  return (
    <StaffDocumentGeneratorClient
      docType="certificate"
      apiEndpoint="/api/admin/staff/certificates"
      title="Staff Certificates"
      subtitle="Design, issue, and archive official service, training, and workshop completion certificates for staff."
      entityName="Certificate"
      icon={BadgeCheck}
      defaultRefPrefix="CERT"
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
          certificateNumber: `CERT-${new Date().getFullYear()}-${staff.id}-01`,
          trainingTopic: "Advanced Pedagogical Leadership & Digital Classroom Teaching",
          completionDate: todayStr,
          issueDate: todayStr,
          signatoryName: currentUser?.full_name || "Deepak Yadav",
          signatoryDesignation: isPlatformAdmin ? "Director & Chairman" : "Head of Academics",
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
            <Label className="text-xs">Training Topic / Certification Reason</Label>
            <Input
              value={fieldForm.trainingTopic || ""}
              onChange={(e) => setFieldForm({ ...fieldForm, trainingTopic: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Completion Date</Label>
              <Input
                value={fieldForm.completionDate || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, completionDate: e.target.value })}
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
              <Label className="text-xs">Certificate Number</Label>
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
