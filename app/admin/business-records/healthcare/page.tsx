"use client";

import { HeartPulse } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function BusinessHealthcarePage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="healthcare"
        title="Patient Registration & Directory"
        description="Confidential patient management, medical departments, doctor assignments, and emergency details."
        icon={HeartPulse}
      />
    </div>
  );
}
