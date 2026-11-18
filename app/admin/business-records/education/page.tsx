"use client";

import { GraduationCap } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function BusinessEducationPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="education"
        title="Student Directory & Enrollments"
        description="Register and manage students, course allocations, admission records, and academic status."
        icon={GraduationCap}
      />
    </div>
  );
}
