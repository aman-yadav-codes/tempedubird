import { FileCheck2 } from "lucide-react";
import { StaffComingSoon } from "@/app/admin/staff/coming-soon";

export default function StaffExperienceLettersPage() {
  return (
    <StaffComingSoon
      title="Experience Letters"
      description="Generate, verify, and archive official experience letters and relieving certificates for teaching and non-teaching staff."
      icon={FileCheck2}
      items={[
        "Automated tenure, designation & conduct records",
        "Official relieving and experience letter generation",
        "Signatory authorization & digital seal",
        "Permanent staff credential verification archive",
      ]}
    />
  );
}
