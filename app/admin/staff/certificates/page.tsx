import { BadgeCheck } from "lucide-react";
import { StaffComingSoon } from "@/app/admin/staff/coming-soon";

export default function StaffCertificatesPage() {
  return (
    <StaffComingSoon
      title="Staff Certificates"
      description="Issue and track official staff certificates, service completions, training awards, and credentials."
      icon={BadgeCheck}
      items={[
        "Institution branded certificate designer",
        "Training & workshop completion certificates",
        "Tenure & service recognition awards",
        "Instant digital verification QR codes",
      ]}
    />
  );
}
